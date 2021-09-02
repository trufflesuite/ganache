export type EvmStepContext = {};

export type VmStepData = {
  opcode: {
    name: string;
  };
};

export type VmStepEvent = {
  context: EvmStepContext;
  data: VmStepData;
};
export function makeStepEvent(context: EvmStepContext, event: any) {
  return {
    context,
    data: {
      opcode: {
        name: event.opcode.name
      }
    }
  };
}

export type VmBeforeTransactionEvent = {
  context: EvmStepContext;
};

export type VmAfterTransactionEvent = {
  context: EvmStepContext;
};

export type DataEvent = {
  jsonrpc: "2.0";
  method: "eth_subscription";
  params: any; // TODO
};

export type MessageEvent = {
  jsonrpc: "2.0";
  method: "eth_subscription";
  params: any; // TODO
};
