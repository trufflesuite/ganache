import { BUFFER_ZERO, Quantity } from "@ganache/utils";
import type { InterpreterStep } from "@ethereumjs/vm/dist/evm/interpreter";
import { ConsoleLogs } from "@ganache/console.log";

export type EvmStepContext = {};

export type VmStepData = ReturnType<typeof normalizeEvent>;

export type VmStepEvent = {
  readonly context: EvmStepContext;
  readonly data: VmStepData;
};

function normalizeEvent(event: InterpreterStep) {
  const { account, memory: originalMemory, opcode } = event;
  const memoryLength = originalMemory.length;

  // We need to copy some buffers so the user can't mutate them on us:
  // Instead of making a bunch of individual buffers, we just make 1 and then
  // fill it in as needed.
  const sharedBuffer = Buffer.allocUnsafe(104 + memoryLength);
  account.stateRoot.copy(sharedBuffer, 0, 0, 32); // always 32 bytes
  account.codeHash.copy(sharedBuffer, 32, 0, 32); // always 32 bytes
  event.address.buf.copy(sharedBuffer, 64, 0, 20); // always 20 bytes
  event.codeAddress.buf.copy(sharedBuffer, 84, 0, 20); // always 20 bytes
  const stateRoot = sharedBuffer.slice(0, 32);
  const codeHash = sharedBuffer.slice(32, 64);
  const address = sharedBuffer.slice(64, 84);
  const codeAddress = sharedBuffer.slice(84, 104);
  let memory: Buffer;
  if (memoryLength !== 0) {
    originalMemory.copy(sharedBuffer, 104, 0, memoryLength);
    memory = sharedBuffer.slice(104, 104 + memoryLength);
  } else {
    memory = BUFFER_ZERO;
  }

  return {
    account: {
      nonce: Quantity.from(account.nonce.toArrayLike(Buffer)).toBigInt(),
      balance: Quantity.from(account.balance.toArrayLike(Buffer)).toBigInt(),
      stateRoot,
      codeHash
    },
    address,
    codeAddress,
    depth: BigInt(event.depth),
    gasLeft: Quantity.from(event.gasLeft.toArrayLike(Buffer)).toBigInt(),
    gasRefund: Quantity.from(event.gasRefund.toArrayLike(Buffer)).toBigInt(),
    memory,
    memoryWordCount: Quantity.from(
      event.memoryWordCount.toArrayLike(Buffer)
    ).toBigInt(),
    opcode: {
      name: opcode.name,
      fee: opcode.fee
    },
    pc: BigInt(event.pc),
    returnStack: event.returnStack.map(rs => rs.toArrayLike(Buffer)),
    stack: event.stack.map(s => s.toArrayLike(Buffer))
  };
}

export function makeStepEvent(context: EvmStepContext, event: InterpreterStep) {
  return {
    context,
    data: normalizeEvent(event)
  };
}

export type VmBeforeTransactionEvent = {
  readonly context: EvmStepContext;
};

export type VmAfterTransactionEvent = {
  readonly context: EvmStepContext;
};

export type VmConsoleLogEvent = {
  readonly context: EvmStepContext;
  readonly logs: ConsoleLogs | null;
};

export type DataEvent = {
  jsonrpc: "2.0";
  method: "eth_subscription";
  params: any; // TODO
};

export type MessageEvent = {
  readonly type: "eth_subscription";
  readonly data: {
    readonly subscription: string;
    readonly result: unknown;
  };
};
