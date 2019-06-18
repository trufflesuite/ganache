/**
 * @param {Array} ops Array of all ops/steps of the VM
 * @param {Number} lowestIndex Known lowestIndex
 */
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
    } else if (!steps.success() || !opsLength) {
      let estimate = result.gasUsed;
      result.gasEstimate = estimate;
    } else {
      const actualUsed = steps.ops[0].gasLeft.sub(steps.ops[steps.ops.length - 1].gasLeft).toNumber();
      const total = getTotal();
      const sixtyFloorths = total - actualUsed;
      result.gasEstimate = result.gasUsed.addn(sixtyFloorths);
    }

    callback(vmerr, result);
  });

  const Context = (index, fee) => {
    const base = index === 0;
    let start = index;
    let stop = 0;
    let cost = 0;
    let sixtyFloorths = 0;
    const op = steps.ops[index];
    const next = steps.ops[index + 1];
    const intermediateCost = op.gasLeft - next.gasLeft;
    let callingFee = fee || 0;
    let compositeContext = false;

    function addGas(val) {
      if (sixtyFloorths) {
        if (val >= sixtyFloorths) {
          sixtyFloorths = 0;
        } else {
          sixtyFloorths -= val;
        }
      }
      cost += val;
    }

    return {
      start: () => start,
      stop: () => stop,
      setStart: (val) => {
        start = val;
        compositeContext = true;
      },
      setStop: (val) => {
        stop = val;
      },
      getCost: () => ({ cost, sixtyFloorths }),
      transfer: (ctx) => {
        const values = ctx.getCost();
        addGas(values.cost);
        sixtyFloorths += values.sixtyFloorths;
      },
      addSixtyFloorth: (sixtyFloorth) => {
        sixtyFloorths += sixtyFloorth;
      },
      addRange: (fee = false) => {
        if (fee) {
          // only occurrs on stack increasing ops
          addGas(steps.ops[base || compositeContext ? start : start + 1].gasLeft - steps.ops[stop].gasLeft + fee);
        } else {
          let range;
          if (stop !== steps.ops.length - 1 && compositeContext) {
            range = steps.ops[start].gasLeft - steps.ops[stop - 1].gasLeft;
            addGas(range);
            const tail = steps.ops[stop - 1].gasLeft - steps.ops[stop].gasLeft;
            range = tail + intermediateCost;
          } else {
            range = steps.ops[start].gasLeft - steps.ops[stop].gasLeft;
          }
          range -= callingFee;
          addGas(range);
          if (stop !== steps.ops.length - 1) {
            cost += sixtyFloorths;
            sixtyFloorths = Math.floor(cost / 63);
          }
        }
      }
    };
  };

  const getTotal = () => {
    const sysops = steps.systemOps;
    const ops = steps.ops;
    const opIndex = (cursor) => sysops[cursor].index;
    const stack = [];
    let cursor = 0;
    let context = Context(0);
    while (cursor < sysops.length) {
      const currentIndex = opIndex(cursor);
      const current = ops[currentIndex];
      const name = current.opcode.name;
      if (isCall(name)) {
        if (steps.isSVT(currentIndex)) {
          context.setStop(currentIndex + 1);
          context.addRange(current.opcode.fee);
          context.setStart(currentIndex + 1);
          context.addSixtyFloorth(2300);
        } else {
          context.setStop(currentIndex);
          context.addRange(current.opcode.fee);
          stack.push(context);
          context = Context(currentIndex, current.opcode.fee); // setup next context
        }
      } else if (isCreate(name)) {
        context.setStop(currentIndex);
        context.addRange(current.opcode.fee);
        stack.push(context);
        context = Context(currentIndex, current.opcode.fee); // setup next context
      } else if (isTerminator(name)) {
        // only on the last operation
        context.setStop(currentIndex + 1 < steps.ops.length ? currentIndex + 1 : currentIndex);
        context.addRange();
        const ctx = stack.pop();
        if (ctx) {
          ctx.transfer(context);
          context = ctx;
          context.setStart(currentIndex + 1);
        } else {
          let gas = context.getCost();
          return gas.cost + gas.sixtyFloorths;
        }
      } else {
        throw new Error("INVALID OPCODE");
      }
      cursor++;
    }
  };
};

const isCall = (opname) => ["CALL", "DELEGATECALL", "STATICCALL", "CALLCODE"].includes(opname);
const isCreate = (opname) => ["CREATE", "CREATE2"].includes(opname);
const isTerminator = (opname) => ["STOP", "RETURN", "REVERT", "INVALID", "SELFDESTRUCT"].includes(opname);

const stepTracker = () => {
  const sysOps = [];
  const allOps = [];
  const svt = [];
  let simpleCallCheck = false;
  let simpleCallDepth = 0;
  return {
    collect: (info) => {
      if (simpleCallCheck) {
        // This is checking for what ive been calling a simple value transfer
        // where there is a CALL operation with no subsequent STOP/RETURN
        // and where the `call depth` never increases.
        // It's usually as a result of a .call or .transfer in solidity to an
        // external account or a contract with no payable.
        // simpleCallCheck acts as a boolean flag checking whether the previous
        // operation was a CALL. The flag is set during the `isCall` conditional
        // as well as the simpleCallDepth so its always `up-to-date`.
        if (info.depth === simpleCallDepth) {
          // If the current depth (info.depth) equals the depth of a simpleCall
          // we record its position.
          svt.push(allOps.length - 1);
        }
        // Reset the flag immediately here
        simpleCallCheck = false;
      }
      if (isCall(info.opcode.name)) {
        simpleCallCheck = true;
        simpleCallDepth = info.depth;
        sysOps.push({ index: allOps.length, depth: info.depth, name: info.opcode.name });
      } else if (isCreate(info.opcode.name) || isTerminator(info.opcode.name)) {
        sysOps.push({ index: allOps.length, depth: info.depth, name: info.opcode.name });
      }
      // This goes last so we can use the length for the index ^
      allOps.push(info);
    },
    isSVT: (index) => svt.includes(index),
    success: () => !allOps.length || isTerminator(allOps[allOps.length - 1].opcode.name),
    ops: allOps,
    systemOps: sysOps
  };
};
