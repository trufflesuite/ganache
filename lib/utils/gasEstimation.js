/**
 * @param {Array} ops Array of all ops/steps of the VM
 * @param {Number} start Beginning index of the search space
 * @param {Number} stop  Ending index of the search space
 * @param {Number} lowestIndex Known lowestIndex
 */
module.exports = (ops, lowestGasIndex) => {
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
    while (ops[end].depth > 0) {
      ++end;
    }
    while (ops[begin].depth > 0) {
      --begin;
    }
    return {
      // begin and end overshoot by 1
      // adjust in respective direction
      begin: begin + 1,
      end: end - 1
    };
  };

  /**
   * Finds the lowest index in a given search space
   * @param {*} start The beginning index of the search space
   * @param {*} stop The ending index of the search space
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
   * @param {*} start The beginning index of the search space
   * @param {*} stop The ending index of the search space
   * @param {*} lowestIndex If the index of the lowest gas point is known otherwise null
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
    const { begin, end } = findRange(lowestIndex);

    // Assert - must be a System op: CREATE/CALL/etc
    const callingSysOp = ops[begin - 1];

    // Cost of the system operation itself
    const callingFee = callingSysOp.opcode.fee;

    // If our heuristic approach fails it will be due to the way this traverses
    // back to depth zero rather than current depth - 1.
    // If we can find an example where our assumptions break we would need to change sumRange
    // to calculate outwards for each depth (to the end of the contract) to determine
    // the extra gas needed.
    const sumOfSysOp = sumRange(begin - 1, end + 1) - callingFee;

    // What we need before the 1/64 is held back
    const neededBefore6364 = Math.floor((sumOfSysOp * 64) / 63);
    let total = neededBefore6364 + callingFee;

    // Sum to the top of the range above sysOp
    total += sumRange(start, begin - 1);

    const oneSixtyFloorth = neededBefore6364 - sumOfSysOp;

    // Sum of the remaining steps after the current (outer) system operation
    const remaining = sumRange(end + 1, stop);
    if (oneSixtyFloorth > remaining) {
      // If we withhold more than the cost of all remaining operations
      return total;
    }

    // recursively sum the remaining search space and return this total minus the 1/64th we already accounted for
    total -= oneSixtyFloorth;
    return total + getTotal(end + 1, stop);
  };

  return getTotal(0, ops.length - 1, lowestGasIndex);
};
