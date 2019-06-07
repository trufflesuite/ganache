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
      // const val = steps.ops[0].gasLeft.sub(steps.ops[steps.ops.length - 1].gasLeft).toNumber();
      // const res = val + Math.floor(val / 62) + costOfData;
      // result.gasEstimate = new BN(res);
      const total = getTotal(costOfData);
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
          // val -= sixtyFloorths;
          sixtyFloorths = 0;
          // cost += val;
        } else {
          sixtyFloorths -= val;
        }
      }
      // } else {
      cost += val;
      // }
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
        // cost += values.cost;
        sixtyFloorths += values.sixtyFloorths;
      },
      addRange: (fee = false) => {
        if (fee) {
          // only occurrs on stack increasing ops
          addGas(steps.ops[base ? start : start + 1].gasLeft - steps.ops[stop].gasLeft + fee);
        } else {
          let range;
          if (stop !== steps.ops.length - 1 && compositeContext) {
            range = steps.ops[start].gasLeft - steps.ops[stop - 1].gasLeft;
            addGas(range);
            const tail = steps.ops[stop - 1].gasLeft - steps.ops[stop].gasLeft;
            range = tail + intermediateCost;
          } else {
            // const begin = start <= 0 ? 0 : start - 1;
            range = steps.ops[start].gasLeft - steps.ops[stop].gasLeft;
          }
          range -= callingFee;
          addGas(range);
          if (stop !== steps.ops.length - 1) {
            sixtyFloorths += Math.floor(range / 63);
          }
        }
        // cost += range;
      }
    };
  };

  const getTotal = (dataCost = 0) => {
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
        // TODO
        // if (SVT) {
        // } else {
        context.setStop(currentIndex);
        context.addRange(current.opcode.fee);
        stack.push(context);
        context = Context(currentIndex, current.opcode.fee); // setup next context
        // }
      } else if (isCreate(name)) {
        context.setStop(currentIndex);
        context.addRange(current.opcode.fee);
        stack.push(context);
        context = Context(currentIndex, current.opcode.fee); // setup next context
      } else if (isTerminator(name)) {
        // eslint-disable-next-line max-len
        context.setStop(currentIndex + 1 < steps.ops.length ? currentIndex + 1 : currentIndex); // only on the last op
        // context.setStop(currentIndex); // only on the last op
        context.addRange();
        const ctx = stack.pop();
        if (ctx) {
          ctx.transfer(context);
          context = ctx;
          context.setStart(currentIndex + 1);
        } else {
          let gas = context.getCost();
          return gas.cost + gas.sixtyFloorths + dataCost;
        }
      } else {
        throw new Error("INVALID OPCODE");
      }
      cursor++;
    }
  };
};

const isCall = (opname) => ["CALL", "DELEGATECALL", "STATICCALL", "CALLCODE"].includes(opname);
const isCreate = (opname) => ["CREATE"].includes(opname);
const isTerminator = (opname) => ["STOP", "RETURN", "REVERT", "INVALID", "SELFDESTRUCT"].includes(opname);
const stepTracker = () => {
  const sysOps = [];
  const allOps = [];
  const svt = [];
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
      // It's usually as a result of a .call or .transfer in solidity to an
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
        sysOps.push({ index: allOps.length, depth: info.depth, name: info.opcode.name });
      } else if (isCreate(info.opcode.name) || isTerminator(info.opcode.name)) {
        sysOps.push({ index: allOps.length, depth: info.depth, name: info.opcode.name });
      }

      allOps.push(info); // This goes last so we can use the length for the index ^
    },
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
