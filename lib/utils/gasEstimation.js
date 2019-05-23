const BN = require("bn.js");
// const { writeFileSync, mkdirSync } = require("fs");
/**
 * @param {Array} ops Array of all ops/steps of the VM
 * @param {Number} lowestIndex Known lowestIndex
 */
// let folder = 0;
module.exports = (vm, runArgs, err, callback) => {
  const steps = stepTracker();

  vm.on("step", steps.collect);

  vm.runTx(runArgs, function(vmerr, result) {
    const opsLength = steps.ops.length;
    if (vmerr) {
      // This is a check that has been in there for awhile. I'm unsure if it's required, but it can't hurt.
      if (vmerr instanceof Error === false) {
        vmerr = new Error("VM error: " + vmerr);
      }
      return callback(vmerr, err);
    } else if (!steps.success() || !opsLength || opsLength - 1 === steps.lowestGasIndex()) {
      let estimate = result.gasUsed;
      if (opsLength) {
        const lastSVT = steps.lastSVT();
        if (steps.success() && lastSVT > 0) {
          const tailCost = steps.ops[lastSVT].gasLeft.sub(steps.ops[steps.ops.length - 1].gasLeft);
          const stipend = new BN(2300);
          estimate = estimate.add(new BN(tailCost.lt(stipend) ? stipend.sub(tailCost) : 0));
        }
      }
      result.gasEstimate = estimate;
    } else {
      const data = runArgs.tx.data != null ? Array.from(runArgs.tx.data) : [];
      // Base Fee 21000: cost of an elliptic curve operation to recover the sender pubkey/address from
      // signature plus disk and bandwidth space of storing the transaction.
      // Data Costs 4 * (# of 0 bytes) + 68 * (# of non-zero bytes)
      // This line is just calculating the data costs ^.
      // Read: start with 21000, iterate through the data
      // (each element represents a byte)
      // if the current byte is 0 add 4 otherwise add 68.
      const costOfData = data.reduce((acc, curr) => acc + (curr === 0 ? 4 : 68), 21000);

      const total = getTotal(0, steps.ops.length - 1, steps.sysOpIndex()) + costOfData;
      result.gasEstimate = new BN(total);
    }
    // if (steps.ops.length) {
    //   mkdirSync(`/home/cashlion/Desktop/gaslogs/${folder}/`);
    //   writeFileSync(
    //     `/home/cashlion/Desktop/gaslogs/${folder}/ESTIMATEall.txt`,
    //     steps.ops
    //       .map(
    //         (val) =>
    //         // eslint-disable-next-line max-len
    //        `${val.depth}  ${val.opcode.name}: ${val.opcode.fee} ${val.gasLeft.toNumber()} ${val.gasLeft.toNumber() -
    //             val.opcode.fee}`
    //       )
    //       .join("\n")
    //   );
    //   writeFileSync(
    //     `/home/cashlion/Desktop/gaslogs/${folder++}/ESTIMATEsys.txt`,
    //     steps.systemOps
    //       .map(
    //         (val) =>
    //           `INDEX: ${val.index}, DEPTH: ${val.depth}, OPNAME: ${val.name}`
    //       )
    //       .join("\n")
    //   );
    // }
    callback(vmerr, result);
  });

  /**
   * Returns the sum of all costs in a range
   * opcode fees, memory expansion costs, return costs, etc
   * @param {Number} start Beginning index
   * @param {Number} end Ending index
   */
  const sumRange = (start, end) => {
    const lastSVT = steps.lastSVT();
    if (lastSVT > start && lastSVT < end) {
      const top = steps.ops[start].gasLeft - steps.ops[lastSVT].gasLeft;
      let needed;
      if (steps.ops[lastSVT].depth) {
        const tail = steps.ops[lastSVT].gasLeft - steps.ops[end - 1].gasLeft;
        needed = tail < 2300 ? 2300 - tail : tail;
      } else {
        const tail = steps.ops[lastSVT].gasLeft - steps.ops[end].gasLeft;
        needed = tail < 2300 ? 2300 : tail;
      }
      return top + needed;
    }
    return steps.ops[start].gasLeft - steps.ops[end].gasLeft;
  };

  /**
   * Finds the index in systemOps index
   * @param {Number} index index of op in steps.ops
   */
  const findRootScope = (opIndex) => {
    const index = steps.findIndex(opIndex);
    let begin = index;
    let end = index;
    const length = steps.systemOps.length;
    while (begin && steps.systemOps[begin][1]) {
      --begin;
    }
    while (end < length && steps.systemOps[end][1]) {
      ++end;
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
    const index = steps.findIndex(opIndex);
    let begin = index;
    let end = index;
    const length = steps.systemOps.length;
    while (end < length && steps.systemOps[end][1] >= depth) {
      ++end;
    }
    while (begin && steps.systemOps[begin][1] >= depth) {
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
    let lowestIndex = stop;
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
  const isStipend = (op) => op.gasLeft === 2300;

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
      // assert xnor
      // TODO: Assert op must be a System op: CREATE/CALL/etc
      const callingSysOp = steps.ops[parentBegin];

      // Cost of the system operation itself
      const callingFee = callingSysOp.opcode.fee;
      const sumOfCurrentSysOp = sumRange(parentBegin, parentEnd) - callingFee;

      // What we need before the 1/64 is held back
      const neededBefore6364 = sumOfCurrentSysOp + Math.floor(sumOfCurrentSysOp / 63);
      const oneSixtyFloorth = neededBefore6364 - sumOfCurrentSysOp;

      systemOpSum = neededBefore6364 + callingFee;
      const next = steps.findIndex(lowestIndex) + 1;

      const prevParentBegin = parentBegin;
      const prevParentEnd = parentEnd;

      ({ parentBegin, parentEnd } = findParentScope(steps.systemOps[next][0]));
      lowestIndex = parentEnd - 1;

      // Sum to the top of the range above sysOp
      systemOpSum += gas(steps.ops[parentBegin + 1]) - gas(steps.ops[prevParentBegin]);
      // systemOpSum += sumRange(parentBegin - 1, prevParentBegin);

      // Sum of the remaining steps after the current (outer) system operation
      const costOfParentReturn =
        gas(steps.ops[parentEnd - 1]) -
        gas(steps.ops[parentEnd]) +
        gas(steps.ops[parentBegin]) -
        steps.ops[parentBegin].opcode.fee -
        gas(steps.ops[parentBegin + 1]);
      // recursively sum the remaining search space and return this total minus the 1/64th we already accounted for
      const remaining = getTotal(prevParentEnd, lowestIndex) + costOfParentReturn;
      // if ((stipend && stipend < remaining) || oneSixtyFloorth < remaining) {
      let tail = oneSixtyFloorth;
      if (callingSysOp.opcode.name === "CALL" && isStipend(steps.ops[rootBegin + 1])) {
        tail = 2300;
      }
      if (tail < remaining) {
        systemOpSum = 0;
      }
    }

    // TODO: Assert op must be a System op: CREATE/CALL/etc
    const callingSysOp = steps.ops[rootBegin];

    // Cost of the system operation itself
    const callingFee = callingSysOp.opcode.fee;

    if (!systemOpSum) {
      systemOpSum = sumRange(rootBegin, rootEnd) - callingFee;
    }

    // What we need before the 1/64 is held back
    const neededBefore6364 = systemOpSum + Math.floor(systemOpSum / 63);
    let total = neededBefore6364 + callingFee;

    // Sum to the top of the range above sysOp
    total += sumRange(start, rootBegin);

    const oneSixtyFloorth = neededBefore6364 - systemOpSum;
    const remaining = getTotal(rootEnd, stop);
    if (callingSysOp.opcode.name === "CALL" && isStipend(steps.ops[rootBegin + 1])) {
      return total - remaining;
    }

    // Recursively Sum of the remaining steps after the current (outer) system operation
    if (oneSixtyFloorth > remaining) {
      // If we withhold more than the cost of all remaining operations
      return total;
    }
    total -= oneSixtyFloorth;

    return total + remaining;
  };
};

const stepTracker = () => {
  const sysOps = [];
  const allOps = [];
  const svt = [];
  const isCall = (opname) => ["CALL", "DELEGATECALL", "STATICCALL", "CALLCODE"].includes(opname);
  const isCreate = (opname) => ["CREATE"].includes(opname);
  const isTerminator = (opname) => ["STOP", "RETURN", "REVERT", "INVALID", "SELFDESTRUCT"].includes(opname);
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
      // This is checking for what ive been calling a simple value transfer
      // where there is a CALL operation with no subsequent STOP/RETURN
      // and where the `call depth` never increases.
      // It's usually as a result of a .send or .transfer in solidity to an
      // external account or a contract with no payable
      if (simpleCallCheck) {
        // simpleCallCheck acts as a boolean flag checking whether the previous
        // operation was a CALL. The flag is set during the `isCall` conditional
        // as well as the simpleCallDepth so its always `up-to-date`.
        if (info.depth === simpleCallDepth) {
          // If the current depth (info.depth) equals the depth of a simpleCall
          // we record its position.  we can probably use a variable rather than an array
          svt.push(allOps.length);
        }
        // Reset the flag immedietely here
        simpleCallCheck = false;
      }
      if (isCall(info.opcode.name)) {
        simpleCallCheck = true;
        simpleCallDepth = info.depth;
        indexMap[allOps.length] = sysOps.length;
        sysOps.push([allOps.length, info.depth, info.opcode.name]);
      } else if (isCreate(info.opcode.name) || isTerminator(info.opcode.name)) {
        indexMap[allOps.length] = sysOps.length;
        sysOps.push([allOps.length, info.depth, info.opcode.name]);
      }

      allOps.push(info); // This goes last so we can use the length for the index ^
    },
    findIndex: (index) => indexMap[index],
    lowestGasIndex: () => lowestGasIndex,
    sysOpIndex: () => lowestSysOpIndex,
    lastSVT: () => (svt.length ? svt[svt.length - 1] : -1),
    success: () => !allOps.length || isTerminator(allOps[allOps.length - 1].opcode.name),
    ops: allOps,
    systemOps: sysOps,
    simpleValueTransfers: svt,
    isTerminator: isTerminator,
    isCall: isCall
  };
};
