import { BN } from "ethereumjs-util";
import { WORD_SIZE } from "./handlers";
import { signatureMap } from "./signatures";

const CONSOLE_PRECOMPILE = new BN(
  Buffer.from([
    0x63, 0x6f, 0x6e, 0x73, 0x6f, 0x6c, 0x65, 0x2e, 0x6c, 0x6f, 0x67
  ])
);

/**
 * The purpose of this type is to help maintainers visualize the layout of
 * the `stack`.
 */
type LogsStack = [
  ...rest: BN[],
  inLength: BN,
  inOffset: BN,
  toAddress: BN,
  _: BN
];

export const maybeGetLogs = ({
  opcode,
  memory,
  stack
}: {
  opcode: { name: string };
  memory: Buffer;
  stack: BN[];
}): ConsoleLogs | null => {
  if (opcode.name !== "STATICCALL") return null;

  // STATICCALL, which is the OPCODE that is used to initiate a console.log, has
  // 6 params, but we only care about these 3:
  const [inLength, inOffset, toAddress] = (stack as LogsStack).slice(-4, -1);

  // only if the toAddress is our precompile address we should try parsing
  if (!toAddress.eq(CONSOLE_PRECOMPILE)) return null;

  // STATICCALL allows for passing in invalid pointers and lengths
  // so we need to guard against failures with a try/catch
  try {
    const memoryStart = inOffset.toNumber();
    const memoryEnd = memoryStart + inLength.toNumber();
    const values: Buffer = memory.subarray(memoryStart, memoryEnd);
    const method = values.readUInt32BE(0); // 4 bytes wide
    const handlers = signatureMap.get(method);
    if (!handlers) return null;

    const start = 4; // we skip the first 4 bytes, as that is our signature
    return handlers.map((handler, index) => {
      const offset = start + index * WORD_SIZE;
      return handler(values, offset);
    });
  } catch {
    return null;
  }
};

export type ConsoleLog = string | bigint | boolean;
export type ConsoleLogs = ConsoleLog[];
