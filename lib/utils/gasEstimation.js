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
    const opsLength = steps.ops.length;
    const lastOperation = steps.ops[opsLength - 1].opcode.name;
    const failed = lastOperation !== "STOP" && lastOperation !== "RETURN";
    if (vmerr || failed || !opsLength || opsLength - 1 === steps.lowestGasIndex()) {
      let estimate = parseInt(`0x${result.gasUsed.toString("hex")}`);
      if (!failed && steps.simpleValueTransfers.length) {
        const lastSVT = steps.lastSVT();
        const neededAfterCall = 2300 - sumRange(lastSVT, steps.ops.length - 1);
        estimate += neededAfterCall > 0 ? neededAfterCall : 0;
      }
      result.gasEstimate = new BN(estimate);
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
   * Finds the index in systemOps index
   * @param {Number} index index of op in steps.ops
   */
  const findRootScope = (opIndex) => {
    let index = steps.findIndex(opIndex);
    let begin = index;
    let end = index;
    while (steps.systemOps[end][1]) {
      ++end;
    }
    while (steps.systemOps[begin][1]) {
      --begin;
    }
    return {
      rootBegin: steps.systemOps[begin][0],
      rootEnd: steps.systemOps[end - 1][0] + 1 // the op after the matching terminator
    };
  };

  /**
   * Find the range of the current system operation (CREATE, CALL, etc)
   * @param {Number} index Index of the lowest gas point in the domain
   */
  const findParentScope = (opIndex) => {
    let depth = steps.ops[opIndex].depth;
    if (!depth) {
      return false;
    }
    let index = steps.findIndex(opIndex);
    let begin = index;
    let end = index;
    while (steps.systemOps[end][1] >= depth) {
      ++end;
    }
    while (steps.systemOps[begin][1] >= depth) {
      --begin;
    }
    return {
      parentBegin: steps.systemOps[begin][0],
      parentEnd: steps.systemOps[end - 1][0] + 1 // the op after the matching terminator
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

  const gas = (op) => parseInt(`0x${op.gasLeft.toString("hex")}`);

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

    const { rootBegin, rootEnd } = findRootScope(lowestIndex);
    let { parentBegin, parentEnd } = findParentScope(lowestIndex);
    let systemOpSum = 0;
    while (rootBegin !== parentBegin && rootEnd !== parentEnd) {
      // TODO: Assert op must be a System op: CREATE/CALL/etc
      const callingSysOp = steps.ops[parentBegin];

      // Cost of the system operation itself
      const callingFee = callingSysOp.opcode.fee;
      const sumOfCurrentSysOp = sumRange(parentBegin, parentEnd) - callingFee;

      // What we need before the 1/64 is held back
      const neededBefore6364 = sumOfCurrentSysOp + Math.floor(sumOfCurrentSysOp / 63.00000001);
      systemOpSum = neededBefore6364 + callingFee;

      const oneSixtyFloorth = neededBefore6364 - systemOpSum;
      const next = steps.findIndex(lowestIndex) + 1;

      const prevParentBegin = parentBegin;
      const prevParentEnd = parentEnd;

      ({ parentBegin, parentEnd } = findParentScope(steps.systemOps[next][0]));

      // Sum to the top of the range above sysOp
      systemOpSum += sumRange(parentBegin - 1, prevParentBegin);

      // Sum of the remaining steps after the current (outer) system operation
      const costOfParentReturn =
        gas(steps.ops[parentEnd - 1]) -
        gas(steps.ops[parentEnd]) +
        gas(steps.ops[parentBegin]) -
        steps.ops[parentBegin].opcode.fee;
      const remaining = getTotal(prevParentEnd, parentEnd) + costOfParentReturn;
      if (oneSixtyFloorth < remaining) {
        // recursively sum the remaining search space and return this total minus the 1/64th we already accounted for
        systemOpSum = 0;
      }

      lowestIndex = parentEnd - 1;
    }

    // console.log(systemOpSum);
    // TODO: Assert op must be a System op: CREATE/CALL/etc
    const callingSysOp = steps.ops[rootBegin];

    // Cost of the system operation itself
    const callingFee = callingSysOp.opcode.fee;

    if (!systemOpSum) {
      systemOpSum = sumRange(rootBegin, rootEnd) - callingFee;
    }

    // What we need before the 1/64 is held back
    const neededBefore6364 = systemOpSum + Math.floor(systemOpSum / 63.00000001);
    let total = neededBefore6364 + callingFee;

    // Sum to the top of the range above sysOp
    total += sumRange(start, rootBegin);

    const oneSixtyFloorth = neededBefore6364 - systemOpSum;

    // Sum of the remaining steps after the current (outer) system operation
    const remaining = getTotal(rootEnd, stop);
    if (oneSixtyFloorth > remaining) {
      // If we withhold more than the cost of all remaining operations
      return total;
    }

    // recursively sum the remaining search space and return this total minus the 1/64th we already accounted for
    total -= oneSixtyFloorth;
    return total + remaining;
  };
};

const stepTracker = () => {
  const sysOps = [];
  const allOps = [];
  const svt = [];
  const isCall = (opname) => ["CALL", "DELEGATECALL"].includes(opname);
  const isCreate = (opname) => ["CREATE"].includes(opname);
  const isTerminator = (opname) => ["STOP", "RETURN"].includes(opname);
  const indexMap = {};
  let lowestGasLeft = Infinity;
  let lowestGasIndex = 0;
  let lowestSysOpIndex;
  let simpleCallCheck = false;
  let simpleCallDepth = 0;
  return {
    collect: (info) => {
      const gasLeft = info.gasLeft.toNumber();
      if (lowestGasLeft > gasLeft) {
        lowestGasLeft = gasLeft;
        lowestGasIndex = allOps.length;
        lowestSysOpIndex = sysOps.length;
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
        indexMap[allOps.length] = sysOps.length;
        sysOps.push([allOps.length, info.depth, info.opcode.name]);
      } else if (isCreate(info.opcode.name)) {
        indexMap[allOps.length] = sysOps.length;
        sysOps.push([allOps.length, info.depth, info.opcode.name]);
      } else if (isTerminator(info.opcode.name)) {
        indexMap[allOps.length] = sysOps.length;
        sysOps.push([allOps.length, info.depth, info.opcode.name]);
      }

      allOps.push(info); // This goes last so we can use the length for the index ^
    },
    findIndex: (index) => indexMap[index],
    ops: allOps,
    systemOps: sysOps,
    lowestGasIndex: () => lowestGasIndex,
    sysOpIndex: () => lowestSysOpIndex,
    simpleValueTransfers: svt,
    lastSVT: () => (svt.length ? svt[svt.length - 1] : svt)
  };
};
