const { BN } = require("ethereumjs-util");
var RuntimeError = require("./runtimeerror");
/**
 * @param {Array} ops Array of all ops/steps of the VM
 * @param {Number} lowestIndex Known lowestIndex
 */
module.exports = (vm, runArgs, err, callback) => {
  /**
   * Returns the sum of all costs in a range
   * opcode fees, memory expansion costs, return costs, etc
   * @param {Number} start Beginning index
   * @param {Number} end Ending index
   */
  const sumRange = (start, end) => {
    return ops[start].gasLeft - ops[end].gasLeft;
  };

  /**
   * Find the range of the outer most system operation (CREATE, CALL, etc)
   * @param {Number} index Index of the lowest gas point in the domain
   */
  const findRange = (index) => {
    let begin = index;
    let end = index;
    while (ops[end].depth) {
      ++end;
    }
    while (ops[begin].depth) {
      --begin;
    }
    return {
      begin: begin,
      end: end
    };
  };

  /**
   * Finds the lowest index in a given search space
   * @param {Number} start The beginning index of the search space
   * @param {Number} stop The ending index of the search space
   */
  const findLowestIndex = (start, stop) => {
    let lowestGas = Infinity;
    let lowestIndex;
    for (let i = start; i <= stop; i++) {
      if (ops[i].gasLeft <= lowestGas) {
        // Find the new lowest gas index
        lowestIndex = i;
        lowestGas = ops[i].gasLeft;
      }
    }
    return lowestIndex;
  };

  /**
   * Calculates the total gas needed with respect to EIP150
   * @param {Number} start The beginning index of the search space
   * @param {Number} stop The ending index of the search space
   * @param {Number} lowestIndex If the index of the lowest gas point is known otherwise null
   */
  const getTotal = (start, stop, lowestIndex = null) => {
    if (!lowestIndex) {
      // If the lowest index is not known ( on recursive calls if the contract is tail heavy )
      lowestIndex = findLowestIndex(start, stop);
      if (lowestIndex === stop) {
        // If the lowest index is the last operation in the range
        // Return the sum of the range
        return sumRange(start, stop);
      }
    }
    // Find the range of indexes for the outer most system operation
    // TODO: Assert depth > 0
    const { begin, end } = findRange(lowestIndex);

    // TODO: Assert op must be a System op: CREATE/CALL/etc
    const callingSysOp = ops[begin];

    // Cost of the system operation itself
    const callingFee = callingSysOp.opcode.fee;

    // If our heuristic approach fails it will be due to the way this traverses
    // back to depth zero rather than current depth - 1.
    // If we can find an example where our assumptions break we would need to change sumRange
    // to calculate outwards for each depth (keeping a sum to the end of the contract) to determine
    // the extra gas needed.
    const sumOfSysOp = sumRange(begin, end) - callingFee;

    // What we need before the 1/64 is held back
    const neededBefore6364 = Math.floor((sumOfSysOp * 64) / 63);
    let total = neededBefore6364 + callingFee;

    // Sum to the top of the range above sysOp
    total += sumRange(start, begin);

    const oneSixtyFloorth = neededBefore6364 - sumOfSysOp;

    // Sum of the remaining steps after the current (outer) system operation
    const remaining = sumRange(end, stop);
    if (oneSixtyFloorth > remaining) {
      // If we withhold more than the cost of all remaining operations
      return total;
    }

    // recursively sum the remaining search space and return this total minus the 1/64th we already accounted for
    total -= oneSixtyFloorth;
    return total + getTotal(end, stop);
  };

  let ops = [];
  let lowestGasLeft = Infinity;
  let lowestGasIndex = 0;

  vm.on("step", function(info) {
    const gasLeft = info.gasLeft.toNumber();
    if (lowestGasLeft > gasLeft) {
      lowestGasLeft = gasLeft;
      lowestGasIndex = ops.length;
    }
    ops.push(info); // This goes last so we can use the length for the index ^
  });

  vm.runTx(runArgs, function(vmerr, result) {
    if (ops.length === 0 || ops.length - 1 === lowestGasIndex) {
      result.gasEstimate = result.gasUsed;
    } else {
      // 21000: cost of an elliptic curve operation to recover the sender pubkey/address from
      // signature plus disk and bandwidth space of storing the transaction.
      const dataCostsPlusBaseFee = parseInt("0x" + runArgs.tx.gasLimit.toString("hex")) - ops[0].gasLeft;
      const total = getTotal(0, ops.length - 1, lowestGasIndex) + dataCostsPlusBaseFee;
      result.gasEstimate = new BN(total);
    }

    // This is a check that has been in there for awhile. I'm unsure if it's required, but it can't hurt.
    if (vmerr && vmerr instanceof Error === false) {
      vmerr = new Error("VM error: " + vmerr);
    }

    // If we're given an error back directly, it's worse than a runtime error. Expose it and get out.
    if (vmerr) {
      return callback(vmerr, err);
    }

    // If no error, check for a runtime error. This can return null if no runtime error.
    vmerr = RuntimeError.fromResults([runArgs.tx], { results: [result] });

    callback(vmerr, result);
  });
};
