const { BN } = require("ethereumjs-util");
var RuntimeError = require("./runtimeerror");
/**
 * @param {Array} ops Array of all ops/steps of the VM
 * @param {Number} lowestIndex Known lowestIndex
 */
module.exports = (vm, runArgs, err, callback) => {
  const steps = stepTracker();

  vm.on("step", steps.collect);

  vm.runTx(runArgs, function(vmerr, result) {
    if (vmerr || !steps.ops.length || steps.ops.length - 1 === steps.lowestGasIndex()) {
      result.gasEstimate = result.gasUsed;
    } else {
      // Base Fee 21000: cost of an elliptic curve operation to recover the sender pubkey/address from
      // signature plus disk and bandwidth space of storing the transaction.
      // Data Costs 4 * (# of 0 bytes) + 68 * (# of non-zero bytes)
      const dataCostsPlusBaseFee = parseInt("0x" + runArgs.tx.gasLimit.toString("hex")) - steps.ops[0].gasLeft;
      const total = getTotal(0, steps.ops.length - 1, steps.sysOpIndex()) + dataCostsPlusBaseFee;
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

  /**
   * Returns the sum of all costs in a range
   * opcode fees, memory expansion costs, return costs, etc
   * @param {Number} start Beginning index
   * @param {Number} end Ending index
   */
  const sumRange = (start, end) => {
    return steps.ops[start].gasLeft - steps.ops[end].gasLeft;
  };

  /**
   * Find the range of the outer most system operation (CREATE, CALL, etc)
   * @param {Number} index Index of the lowest gas point in the domain
   */
  const findRange = (index) => {
    for (let i = 0; i < steps.systemOps.length; i++) {
      const element = steps.systemOps[i];
      if (index === element[0]) {
        index = i;
        break;
      }
    }
    let begin = index;
    let end = index;
    while (steps.systemOps[end][1]) {
      ++end;
    }
    while (steps.systemOps[begin][1]) {
      --begin;
    }
    return {
      begin: steps.systemOps[begin][0],
      end: steps.systemOps[end - 1][0] + 1 // the op after the matching terminator
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
      if (steps.ops[i].gasLeft <= lowestGas) {
        // Find the new lowest gas index
        lowestIndex = i;
        lowestGas = steps.ops[i].gasLeft;
      }
    }
    return lowestIndex;
  };

  /**
   * Calculates the total gas needed with respect to EIP150
   * @param {Number} start The beginning index of the search space
   * @param {Number} stop The ending index of the search space
   * @param {Number|null} lowestIndex If the index of the lowest gas point is known otherwise null
   */
  const getTotal = (start, stop, lowestIndex = null) => {
    if (lowestIndex) {
      lowestIndex = steps.systemOps[lowestIndex][0];
    } else {
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
    const callingSysOp = steps.ops[begin];

    // Cost of the system operation itself
    const callingFee = callingSysOp.opcode.fee;

    // If our heuristic approach fails it will be due to the way this traverses
    // back to depth zero rather than current depth - 1.
    // If we can find an example where our assumptions break we would need to change sumRange
    // to calculate outwards for each depth (keeping a sum to the end of the contract) to determine
    // the extra gas needed.
    const sumOfSysOp = sumRange(begin, end) - callingFee;

    // What we need before the 1/64 is held back
    const neededBefore6364 = sumOfSysOp + Math.floor(sumOfSysOp / 63.00000001);
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
};

const stepTracker = () => {
  const sysOps = [];
  const allOps = [];
  const svt = [];
  const isCall = (opname) => ["CALL", "DELEGATECALL"].includes(opname);
  const isCreate = (opname) => ["CREATE"].includes(opname);
  const isTerminator = (opname) => ["STOP", "RETURN"].includes(opname);
  let lowestGasLeft = Infinity;
  let lowestGasIndex = 0;
  let sysOpIndex;
  let simpleCallCheck = false;
  let simpleCallDepth = 0;
  return {
    collect: (info) => {
      const gasLeft = info.gasLeft.toNumber();
      if (lowestGasLeft > gasLeft) {
        lowestGasLeft = gasLeft;
        lowestGasIndex = allOps.length;
        sysOpIndex = sysOps.length;
      }
      if (simpleCallCheck) {
        if (info.depth === simpleCallDepth) {
          //
          svt.push(allOps.length);
        }
        simpleCallCheck = false;
      }
      if (isCall(info.opcode.name)) {
        simpleCallCheck = true;
        simpleCallDepth = info.depth;
        sysOps.push([allOps.length, info.depth, info.opcode.name]);
      }
      if (isCreate(info.opcode.name)) {
        sysOps.push([allOps.length, info.depth, info.opcode.name]);
      }
      if (isTerminator(info.opcode.name)) {
        sysOps.push([allOps.length, info.depth, info.opcode.name]);
      }

      allOps.push(info); // This goes last so we can use the length for the index ^
    },
    ops: allOps,
    systemOps: sysOps,
    lowestGasIndex: () => lowestGasIndex,
    sysOpIndex: () => sysOpIndex,
    simpleValueTransfers: svt
  };
};
