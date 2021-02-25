import { BN } from "ethereumjs-util";

export type StepEvent = {
  gasLeft: BN;
  memory: Array<number>; // Not officially sure the type. Not a buffer or uint8array
  stack: Array<BN>;
  depth: number;
  opcode: {
    name: string;
  };
  pc: number;
  address: Buffer;
};
