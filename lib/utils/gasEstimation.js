const STIPEND = 2300;
const callOrCallcode = new Set(["CALL", "CALLCODE"]);

module.exports = async(vm, runArgs, callback) => {
  const steps = stepTracker();
  vm.on("step", steps.collect);

  const Context = (index, fee) => {
    const base = index === 0;
    let start = index;
    let stop = 0;
    let cost = 0;
    let sixtyFloorths = 0;
    const op = steps.ops[index];
    const next = steps.ops[index + 1];
    const intermediateCost = op.gasLeft.sub(next.gasLeft);
    const atTheEnd = stop !== steps.ops.length - 1;
    let callingFee = fee || 0;
    let compositeContext = false;

    function addGas(val) {
      // Add to our current context, but accounted for in sixtyfloorths
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
      addRange: (fee = 0) => {
        // only occurs on stack increasing ops
        addGas(steps.ops[base || compositeContext ? start : start + 1].gasLeft - steps.ops[stop].gasLeft + fee);
      },
      finalizeRange: () => {
        let range;
        if (compositeContext && atTheEnd) {
          range = steps.ops[start].gasLeft - steps.ops[stop - 1].gasLeft;
          addGas(range);
          const tail = steps.ops[stop - 1].gasLeft - steps.ops[stop].gasLeft;
          range = tail + intermediateCost;
        } else {
          range = steps.ops[start].gasLeft - steps.ops[stop].gasLeft;
        }
        range -= callingFee;
        addGas(range);
        if (callOrCallcode.has(op.opcode.name) && !op.stack[op.stack.length - 3].isZero()) {
          cost += sixtyFloorths;
          const innerCost = next.gasLeft.sub(steps.ops[stop - 1].gasLeft);
          if (innerCost.toNumber() > STIPEND) {
            sixtyFloorths = Math.floor(cost / 63);
          } else if (innerCost <= STIPEND) {
            sixtyFloorths = STIPEND - innerCost;
          }
        } else if (stop !== steps.ops.length - 1) {
          cost += sixtyFloorths;
          sixtyFloorths = Math.floor(cost / 63);
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
      if (isCall(name) || isCreate(name)) {
        if (steps.isSVT(currentIndex)) {
          context.setStop(currentIndex + 1);
          context.addRange();
          context.setStart(currentIndex + 1);
          context.addSixtyFloorth(STIPEND);
        } else {
          context.setStop(currentIndex);
          context.addRange(current.opcode.fee);
          stack.push(context);
          context = Context(currentIndex, current.opcode.fee); // setup next context
        }
      } else if (isTerminator(name)) {
        // only on the last operation
        context.setStop(currentIndex + 1 < steps.ops.length ? currentIndex + 1 : currentIndex);
        context.finalizeRange();
        const ctx = stack.pop();
        if (ctx) {
          ctx.transfer(context);
          context = ctx;
          context.setStart(currentIndex + 1);
        } else {
          break;
        }
      } else {
        throw new Error("INVALID OPCODE");
      }
      cursor++;
    }
    let gas = context.getCost();
    return gas.cost + gas.sixtyFloorths;
  };

  const result = await vm.runTx(runArgs).catch((vmerr) => ({ vmerr }));
  const vmerr = result.vmerr;
  if (vmerr) {
    return callback(vmerr);
  } else if (result.execResult.exceptionError) {
    return callback(new Error(`execution error: ${result.execResult.exceptionError.error}`));
  } else if (steps.done()) {
    let estimate = result.gasUsed;
    result.gasEstimate = estimate;
  } else {
    const actualUsed = steps.ops[0].gasLeft.sub(steps.ops[steps.ops.length - 1].gasLeft).toNumber();
    const total = getTotal();
    const sixtyFloorths = total - actualUsed;
    result.gasEstimate = result.gasUsed.addn(sixtyFloorths);
  }
  callback(vmerr, result);
};

const check = (set) => (opname) => set.has(opname);
const isCall = check(new Set(["CALL", "DELEGATECALL", "STATICCALL", "CALLCODE"]));
const isStipend = check(new Set(["CALL", "CALLCODE"]));
const isCreate = check(new Set(["CREATE", "CREATE2"]));
const isTerminator = check(new Set(["STOP", "RETURN", "REVERT", "INVALID", "SELFDESTRUCT"]));

const stepTracker = () => {
  const sysOps = [];
  const allOps = [];
  const svt = [];
  let simpleCallCheck = false;
  let simpleCallDepth = 0;
  return {
    collect: (info) => {
      if (simpleCallCheck) {
        // This is checking for a CALL operation with no subsequent STOP/RETURN
        // and where the 'call depth' never increases.
        // It's usually as a result of a .call or .transfer in solidity to an
        // external account or a contract with no payable.
        // simpleCallCheck acts as a boolean flag checking whether the previous
        // operation was a CALL. The flag is set during the 'isCall' conditional
        // as well as the simpleCallDepth so its always 'up-to-date'.
        if (info.depth === simpleCallDepth) {
          // If the current depth (info.depth) equals the depth of a simpleCall
          // we record its position.
          svt.push(allOps.length - 1);
        }
        // Reset the flag immediately here
        simpleCallCheck = false;
      }
      if (isCall(info.opcode.name)) {
        info.stack = info.stack.map((val) => val.clone());
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
    done: () => !allOps.length || sysOps.length < 2 || !isTerminator(allOps[allOps.length - 1].opcode.name),
    ops: allOps,
    systemOps: sysOps,
    isStipend
  };
};
