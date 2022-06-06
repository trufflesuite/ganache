import { InterpreterStep } from "@ethereumjs/vm/dist/evm/interpreter";
import { BN } from "ethereumjs-util";
import { WORD_SIZE } from "./handlers";
import { signatureMap } from "./signatures";

const CONSOLE_PRECOMPILE = new BN(
  Buffer.from([
    0x63, 0x6f, 0x6e, 0x73, 0x6f, 0x6c, 0x65, 0x2e, 0x6c, 0x6f, 0x67
  ])
);

export const getLogs = ({ memory, stack }: InterpreterStep) => {
  // STATICCALL, which is the OPCODE that is used to initiate a console.log, has
  // 6 params, but we only care about the following 3.
  const [inLength, inOffset, toAddress] = stack.slice(-4, -1);

  // if the toAddress is our precompile address we should try parsing
  if (!toAddress.eq(CONSOLE_PRECOMPILE)) return;

  // TODO: can users pass in values that would cause invalid memory reads?
  // should we check bounds?
  const memoryStart = inOffset.toNumber();
  const memoryEnd = memoryStart + inLength.toNumber();
  const values: Buffer = memory.subarray(memoryStart, memoryEnd);
  const method = values.readUInt32BE(0); // our method
  const handlers = signatureMap.get(method);
  if (!handlers) return null;

  const start = 4;
  const logs = handlers.map((handler, index) => {
    const offset = start + index * WORD_SIZE;
    return handler(memory, offset);
  });

  return logs;
};

export type ConsoleLogs = ReturnType<typeof getLogs>;
