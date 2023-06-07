// gas exactimation:
// There are opcodes, the CALLs and CREATE (CREATE2? i dunno) that must
// "withhold" 1/64th of gasLeft from the gasLimit of these internal CALL/CREATE.
// The withheld gas is not used, it is just not available to any opcodes in the
// same depth, or deeper, than the CALL/CREATE that withheld the gas.
// The withholding computation is done _after_ the cost of the CALL/CREATE is
// subtracted from gasLeft.

// example:
// CODE  GASLEFT  GASLIMIT  COST  DEPTH   1/64
// -------------------------------------------
// CALL     1000      1000   100      0     14
// PUSH      900       886     3      1      0
// RETURN    897       883     0      1      0
// PUSH      897       897     3      0      0
// STOP      894       894     0      0      0
//
// GAS SPENT: 106
// CALL      106       106    100      0     1
// PUSH        6         5      3      1     0
// RETURN      3         2      0      1     0
// PUSH        3         3      3      0     0
// STOP        0         0      0      0     0

// example 2:
// CODE  GASLEFT  GASLIMIT  COST  DEPTH   1/64
// -------------------------------------------
// CALL     1000      1000   100      0     14
// PUSH      900       886     3      1      0
// PUSH      897       883     3      1      0
// RETURN    894       880     0      1      0
// STOP      894       894     0      0      0
//
// GAS SPENT: 106
// CALL      106       106    100      0     1
// PUSH        6         5      3      1     0
// PUSH        3         2      3      1     0 // <-- fails because this actually needs 1 additional gas
// RETURN      0        -1      0      1     0
// STOP        0         0      0      0     0
//
// An algorithm to compute the neccessary gas needs to:
// 1. find the deepest CALL/CREATE depth (if multiple are at the same depth, it doesn't matter which one is used first)
// 2. compute the gas cost, including dynamic costs, of all opcodes within that depth
//   2a. this is the minimum gasLimit needed at this depth to execute the code within it.
// 3. move up to the next highest depth, and repeat step 2, adding in the previous step 2's total gas cost
// 4. continue until all the things have been computed
//
// Caveats:
// * if SSTORE is called and `gas_left <= 2300` it would fail, even though SSTORE doesn't cost 2300 gas.
//   (see https://github.com/wolflo/evm-opcodes/blob/main/gas.md#a7-sstore). So we need to account for that.

import { Interpreter, RunState } from "@ethereumjs/evm/dist/interpreter";
import BN from "bn.js";
import { RuntimeError, RETURN_TYPES } from "@ganache/ethereum-utils";
import { Quantity } from "@ganache/utils";
import { RunTxOpts, RunTxResult, VM } from "@ethereumjs/vm";
import type { InterpreterStep } from "@ethereumjs/evm/";
import { RuntimeBlock } from "@ganache/ethereum-block";
import { appendFileSync, fstat } from "fs";

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

const check = (set: Set<number>) => (opname: number) => set.has(opname);
const isCall = check(new Set([0xf1, 0xf4, 0xfa, 0xf2]));
const isCallOrCallcode = check(new Set([0xf1, 0xf2]));
const isCreate = check(new Set([0xf0, 0xf5]));
const isTerminator = check(
  // TODO: figure out INVALID efficiently
  new Set([0x00, 0xf3, 0xfd, /*"INVALID",*/ 0xff])
);
type SystemOptions = {
  index: number;
  depth: number;
  name: number;
  memoryWordCount: number;
  highestMemCost: BN;
  stack: any[];
};
type I = {
  depth: number;
  opcode: number;
  stack: any[];
  gasLeft: bigint;
  memoryWordCount: number;
  highestMemCost: BN;
};
function subMemUsage(runState: I, offset: number, length: number) {
  //  abort if no usage
  if (!length) return new BN(0);

  const newMemoryWordCount = Math.ceil(Number(offset + length) / 32);
  if (newMemoryWordCount <= runState.memoryWordCount) return new BN(0);
  runState.memoryWordCount = newMemoryWordCount;
  const words = new BN(newMemoryWordCount);
  const fee = new BN(3);
  const quadCoeff = new BN(512);
  // words * 3 + words ^2 / 512
  const cost = words.mul(fee).add(words.mul(words).div(quadCoeff));
  if (cost.cmp(runState.highestMemCost) === 1) {
    return cost.sub(runState.highestMemCost);
  }
  return new BN(0);
}
const stepTracker = () => {
  const sysOps: SystemOptions[] = [];
  const allOps: I[] = [];
  const preCompile: Set<number> = new Set();
  let preCompileCheck = false;
  let precompileCallDepth = 0;
  return {
    collect: (info: I) => {
      if (preCompileCheck) {
        if (info.depth === precompileCallDepth) {
          // If the current depth is unchanged.
          // we record its position.
          preCompile.add(allOps.length - 1);
        }
        // Reset the flag immediately here
        preCompileCheck = false;
      }
      if (isCall(info.opcode)) {
        info.stack = [...info.stack];
        preCompileCheck = true;
        precompileCallDepth = info.depth;
        sysOps.push({
          index: allOps.length,
          depth: info.depth,
          name: info.opcode,
          memoryWordCount: info.memoryWordCount,
          highestMemCost: info.highestMemCost,
          stack: info.stack
        });
      } else if (isCreate(info.opcode) || isTerminator(info.opcode)) {
        sysOps.push({
          index: allOps.length,
          depth: info.depth,
          name: info.opcode,
          memoryWordCount: info.memoryWordCount,
          highestMemCost: info.highestMemCost,
          stack: info.stack
        });
      }
      // This goes last so we can use the length for the index ^
      allOps.push(info);
    },
    isPrecompile: (index: number) => preCompile.has(index),
    done: () =>
      !allOps.length ||
      sysOps.length < 2 ||
      !isTerminator(allOps[allOps.length - 1].opcode),
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
    await vm.eei.checkpoint();
    const result = await vm
      .runTx(runArgs as unknown as RunTxOpts)
      .catch(vmerr => ({ vmerr }));
    await vm.eei.revert();
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

export const installTracker = (vm: VM) => {
  const common = vm._common;
  const steps = stepTracker();
  const oldStep = (vm.evm as any).handleRunStep;
  (vm.evm as any).handleRunStep = (interpreter: Interpreter) => {
    if (oldStep) {
      oldStep.call(vm.evm, interpreter);
    }

    if (!(interpreter as any).afterGasHook) {
      // appendFileSync("./gas.csv", "------------------\n");
      // appendFileSync("./gas.csv", "------------------\n");
      // appendFileSync("./gas.csv", "------------------\n");
      // appendFileSync("./gas.csv", "------------------\n");
      (interpreter as any).afterGasHook = (opInfo, gas) => {
        // appendFileSync(
        //   "./gas.csv",
        //   `"after", "${opInfo.code}", ${interpreter.getGasLeft()}, ${gas}, ${
        //     opInfo.name
        //   },\n`
        // );
        const runState = (interpreter as any)._runState as RunState;
        steps.collect({
          opcode: runState.opCode,
          stack: runState.stack._store,
          depth: interpreter._env.depth,
          gasLeft: runState.gasLeft,
          memoryWordCount: runState.memoryWordCount,
          highestMemCost: runState.highestMemCost
        } as any);
      };
    }

    // console.log("beforeGasHook", runState.opCode, runState.gasLeft);
    // appendFileSync("./gas.csv", "------------------\n");
    // appendFileSync(
    //   "./gas.csv",
    //   `"before", "${runState.opCode}", ${runState.gasLeft},\n`
    // );
  };

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
          isCallOrCallcode(op.opcode) &&
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
      const name = current.opcode;
      if (isCall(name) || isCreate(name)) {
        if (steps.isPrecompile(currentIndex)) {
          context.setStop(currentIndex + 1);
          context.addRange();
          context.setStart(currentIndex + 1);
          context.addSixtyFloorth(STIPEND);
        } else {
          context.setStop(currentIndex);
          const feeBn = bn(isCreate(name) ? 32000 : 100);
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

  return {
    getGasEstimate: (totalGasSpent: bigint): bigint => {
      if (steps.done()) {
        return totalGasSpent;
      } else {
        const gasLeftStart = steps.ops[0].gasLeft;
        const gasLeftEnd = steps.ops[steps.ops.length - 1].gasLeft;
        const actualUsed = bigIntToBN(gasLeftStart - gasLeftEnd);
        const sixtyFloorths = getTotal().sub(actualUsed);
        return (
          totalGasSpent + Quantity.toBigInt(sixtyFloorths.toArrayLike(Buffer))
        );
      }
    }
  };
};

export const exactimate = async (
  vm: VM,
  runArgs: EstimateGasRunArgs,
  callback: (err: Error, result?: EstimateGasResult) => void
) => {
  const { getGasEstimate } = installTracker(vm);

  await vm.eei.checkpoint();
  const result = await vm
    .runTx({
      ...runArgs,
      skipNonce: true,
      skipBalance: true,
      skipBlockGasLimitValidation: true,
      skipHardForkValidation: true
    } as unknown as RunTxOpts)
    .catch(vmerr => ({ vmerr }));
  await vm.eei.revert();
  if ("vmerr" in result) {
    const vmerr = result.vmerr;
    callback(vmerr);
  } else if (result.execResult.exceptionError) {
    console.error(result.execResult.exceptionError);
    const error = new RuntimeError(
      // erroneous gas estimations don't have meaningful hashes
      Quantity.Empty,
      result,
      RETURN_TYPES.RETURN_VALUE
    );
    callback(error, result);
  } else {
    const ret: EstimateGasResult = result;
    ret.gasEstimate = getGasEstimate(result.totalGasSpent);
    callback(null, ret);
  }
};

export default estimateGas;
