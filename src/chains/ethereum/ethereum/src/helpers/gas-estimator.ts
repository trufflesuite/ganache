import BN from "bn.js";
import { RuntimeError, RETURN_TYPES } from "@ganache/ethereum-utils";
import { Quantity } from "@ganache/utils";
import { RunTxOpts, RunTxResult, VM } from "@ethereumjs/vm";
import type { InterpreterStep } from "@ethereumjs/evm/";
import { RuntimeBlock } from "@ganache/ethereum-block";

const bn = (val = 0): BN => new BN(val);
const STIPEND = bn(2300);
export type EstimateGasRunArgs = {
  tx: { gasLimit: bigint };
  block: RuntimeBlock;
  skipBalance: boolean;
  skipNonce: boolean;
};

export type EstimateGasResult =
  | RunTxResult & {
      gasEstimate?: bigint;
    };

const bigIntToBN = (val: bigint) => {
  return new BN(val.toString());
};
const MULTIPLE = 64 / 63;

const check = (set: Set<string>) => (opname: string) => set.has(opname);
const isCall = check(
  new Set(["CALL", "DELEGATECALL", "STATICCALL", "CALLCODE"])
);
const isCallOrCallcode = check(new Set(["CALL", "CALLCODE"]));
const isCreate = check(new Set(["CREATE", "CREATE2"]));
const isTerminator = check(
  new Set(["STOP", "RETURN", "REVERT", "INVALID", "SELFDESTRUCT"])
);
type SystemOptions = {
  index: number;
  depth: number;
  name: string;
};
const stepTracker = () => {
  const sysOps: SystemOptions[] = [];
  const allOps: InterpreterStep[] = [];
  const preCompile: Set<number> = new Set();
  let preCompileCheck = false;
  let precompileCallDepth = 0;
  return {
    collect: (info: InterpreterStep) => {
      if (preCompileCheck) {
        if (info.depth === precompileCallDepth) {
          // If the current depth is unchanged.
          // we record its position.
          preCompile.add(allOps.length - 1);
        }
        // Reset the flag immediately here
        preCompileCheck = false;
      }
      if (isCall(info.opcode.name)) {
        info.stack = [...info.stack];
        preCompileCheck = true;
        precompileCallDepth = info.depth;
        sysOps.push({
          index: allOps.length,
          depth: info.depth,
          name: info.opcode.name
        });
      } else if (isCreate(info.opcode.name) || isTerminator(info.opcode.name)) {
        sysOps.push({
          index: allOps.length,
          depth: info.depth,
          name: info.opcode.name
        });
      }
      // This goes last so we can use the length for the index ^
      allOps.push(info);
    },
    isPrecompile: (index: number) => preCompile.has(index),
    done: () =>
      !allOps.length ||
      sysOps.length < 2 ||
      !isTerminator(allOps[allOps.length - 1].opcode.name),
    ops: allOps,
    systemOps: sysOps
  };
};

const estimateGas = async (
  generateVM: () => Promise<VM>,
  runArgs: EstimateGasRunArgs,
  callback: (err: Error, result?: EstimateGasResult) => void
) => {
  const vm = await generateVM();
  exactimate(vm, runArgs, (err, result) => {
    if (err) return callback(err);
    binSearch(generateVM, runArgs, result, (err, result) => {
      if (err) return callback(err);
      callback(null, result);
    });
  });
};

const binSearch = async (
  generateVM: () => Promise<VM>,
  runArgs: EstimateGasRunArgs,
  result: EstimateGasResult,
  callback: (err: Error, result?: EstimateGasResult) => void
) => {
  const MAX = bigIntToBN(runArgs.block.header.gasLimit);
  const gasRefund = result.execResult.gasRefund;
  const startingGas = gasRefund
    ? bigIntToBN(result.gasEstimate + gasRefund)
    : bigIntToBN(result.gasEstimate);
  const range = { lo: startingGas, hi: startingGas };
  const isEnoughGas = async (gas: BN) => {
    const vm = await generateVM(); // Generate fresh VM
    runArgs.tx.gasLimit = Quantity.toBigInt(gas.toArrayLike(Buffer));
    await vm.stateManager.checkpoint();
    const result = await vm
      .runTx(runArgs as unknown as RunTxOpts)
      .catch(vmerr => ({ vmerr }));
    await vm.stateManager.revert();
    return !("vmerr" in result) && !result.execResult.exceptionError;
  };

  if (!(await isEnoughGas(range.hi))) {
    do {
      range.hi = range.hi.muln(MULTIPLE);
    } while (!(await isEnoughGas(range.hi)));
    while (range.lo.addn(1).lt(range.hi)) {
      const mid = range.lo.add(range.hi).divn(2);
      if (await isEnoughGas(mid)) {
        range.hi = mid;
      } else {
        range.lo = mid;
      }
    }
    if (range.hi.gte(MAX)) {
      if (!(await isEnoughGas(range.hi))) {
        return callback(
          new Error(
            "gas required exceeds allowance or always failing transaction"
          )
        );
      }
    }
  }

  result.gasEstimate = Quantity.toBigInt(range.hi.toArrayLike(Buffer));
  callback(null, result);
};

const exactimate = async (
  vm: VM,
  runArgs: EstimateGasRunArgs,
  callback: (err: Error, result?: EstimateGasResult) => void
) => {
  const steps = stepTracker();
  vm.evm.events.on("step", steps.collect);

  type ContextType = ReturnType<typeof Context>;
  const Context = (index: number, fee?: BN) => {
    const base = index === 0;
    let start = index;
    let stop = 0;
    const cost = bn();
    let sixtyFloorths = bn();
    const op = steps.ops[index];
    const next = steps.ops[index + 1];
    const intermediateCost = bigIntToBN(op.gasLeft - next.gasLeft);
    const callingFee = fee || bn();
    let compositeContext = false;

    function addGas(val: BN) {
      // Add to our current context, but accounted for in sixtyfloorths
      if (sixtyFloorths.gtn(0)) {
        if (val.gte(sixtyFloorths)) {
          sixtyFloorths = bn();
        } else {
          sixtyFloorths.isub(val);
        }
      }
      cost.iadd(val);
    }

    return {
      start: () => start,
      stop: () => stop,
      setStart: (val: number) => {
        start = val;
        compositeContext = true;
      },
      setStop: (val: number) => {
        stop = val;
      },
      getCost: () => ({ cost, sixtyFloorths }),
      transfer: ctx => {
        const values = ctx.getCost();
        addGas(values.cost);
        sixtyFloorths.iadd(values.sixtyFloorths);
      },
      addSixtyFloorth: (sixtyFloorth: BN) => {
        sixtyFloorths.iadd(sixtyFloorth);
      },
      addRange: (fee = bn()) => {
        const range =
          steps.ops[base || compositeContext ? start : start + 1].gasLeft -
          steps.ops[stop].gasLeft;
        // only occurs on stack increasing ops
        addGas(bigIntToBN(range).add(fee));
      },
      finalizeRange: () => {
        let range: BN;
        // if we have a composite context and we are NOT at the final terminator
        if (compositeContext && stop !== steps.ops.length - 1) {
          range = bigIntToBN(
            steps.ops[start].gasLeft - steps.ops[stop - 1].gasLeft
          );
          addGas(range);
          const tail = bigIntToBN(
            steps.ops[stop - 1].gasLeft - steps.ops[stop].gasLeft
          );
          range = tail.add(intermediateCost);
        } else {
          range = bigIntToBN(
            steps.ops[start].gasLeft - steps.ops[stop].gasLeft
          );
        }
        range.isub(callingFee);
        addGas(range);
        if (
          isCallOrCallcode(op.opcode.name) &&
          !(op.stack[op.stack.length - 3] === 0n)
        ) {
          cost.iadd(sixtyFloorths);
          const innerCost = bigIntToBN(
            next.gasLeft - steps.ops[stop - 1].gasLeft
          );
          if (innerCost.gt(STIPEND)) {
            sixtyFloorths = cost.divn(63);
          } else if (innerCost.lte(STIPEND)) {
            sixtyFloorths = STIPEND.sub(innerCost);
          }
        } else if (stop !== steps.ops.length - 1) {
          cost.iadd(sixtyFloorths);
          sixtyFloorths = cost.divn(63);
        }
      }
    };
  };

  const getTotal = () => {
    const sysops = steps.systemOps;
    const ops = steps.ops;
    const opIndex = cursor => sysops[cursor].index;
    const stack: ContextType[] = [];
    let cursor = 0;
    let context: ContextType = Context(0);
    while (cursor < sysops.length) {
      const currentIndex = opIndex(cursor);
      const current = ops[currentIndex];
      const name = current.opcode.name;
      if (isCall(name) || isCreate(name)) {
        if (steps.isPrecompile(currentIndex)) {
          context.setStop(currentIndex + 1);
          context.addRange();
          context.setStart(currentIndex + 1);
          context.addSixtyFloorth(STIPEND);
        } else {
          context.setStop(currentIndex);
          const feeBn = bn(current.opcode.fee);
          context.addRange(feeBn);
          stack.push(context);
          context = Context(currentIndex, feeBn); // setup next context
        }
      } else if (isTerminator(name)) {
        // only on the last operation
        context.setStop(
          currentIndex + 1 < steps.ops.length ? currentIndex + 1 : currentIndex
        );
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
    const gas = context.getCost();
    return gas.cost.add(gas.sixtyFloorths);
  };
  await vm.stateManager.checkpoint();
  const result = await vm
    .runTx(runArgs as unknown as RunTxOpts)
    .catch(vmerr => ({ vmerr }));
  await vm.stateManager.revert();
  if ("vmerr" in result) {
    const vmerr = result.vmerr;
    return callback(vmerr);
  } else if (result.execResult.exceptionError) {
    const error = new RuntimeError(
      // erroneous gas estimations don't have meaningful hashes
      Quantity.Empty,
      result,
      RETURN_TYPES.RETURN_VALUE
    );
    return callback(error, result);
  } else {
    const ret: EstimateGasResult = result;
    if (steps.done()) {
      const estimate = result.totalGasSpent;
      ret.gasEstimate = estimate;
    } else {
      const gasLeftStart = steps.ops[0].gasLeft;
      const gasLeftEnd = steps.ops[steps.ops.length - 1].gasLeft;
      const actualUsed = bigIntToBN(gasLeftStart - gasLeftEnd);
      const sixtyFloorths = getTotal().sub(actualUsed);
      ret.gasEstimate =
        result.totalGasSpent +
        Quantity.toBigInt(sixtyFloorths.toArrayLike(Buffer));
    }
    callback(null, ret);
  }
};

export default estimateGas;
