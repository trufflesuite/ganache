import { AccessList } from "@ethereumjs/tx";

type oneThroughSeven = "1" | "2" | "3" | "4" | "5" | "6" | "7";
type HexChar =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f";
type HexPair = `${oneThroughSeven}${HexChar}`;
type TxType = `0x${HexChar}` | `0x${HexPair}`; // tx types are valid 0 through 7f

export type TypedRpcTransaction =
  | (RpcTransaction & {
      chainId?: never;
      accessList?: never;
    })
  | (RpcTransaction & {
      type: TxType;
      chainId?: string;
      accessList?: AccessList;
    });

export type RpcTransaction =
  | {
      from: string;
      nonce?: string;
      gasPrice?: string;
      gas?: string;
      gasLimit?: never;
      to?: string;
      value?: string;
      data?: string;
      input?: never;
    }
  | {
      from: string;
      nonce?: string;
      gasPrice?: string;
      /**
       * Alias for `gas`
       */
      gasLimit?: string;
      gas?: never;
      to?: string;
      value?: string;
      data?: string;
      input?: never;
    }
  | {
      from: string;
      nonce?: string;
      gasPrice?: string;
      gas?: string;
      gasLimit?: never;
      to?: string;
      value?: string;
      /**
       * Alias for `data`
       */
      input?: string;
      data?: never;
    }
  | {
      from: string;
      nonce?: string;
      gasPrice?: string;
      /**
       * Alias for `gas`
       */
      gasLimit?: string;
      gas?: never;
      to?: string;
      value?: string;
      /**
       * Alias for `data`
       */
      input?: string;
      data?: never;
    }
  // vrs
  | {
      from?: string;
      nonce: string;
      gasPrice?: string;
      gas?: string;
      gasLimit?: never;
      to?: string;
      value?: string;
      data?: string;
      input?: never;
      v: string;
      r: string;
      s: string;
    }
  | {
      from?: string;
      nonce: string;
      gasPrice?: string;
      /**
       * Alias for `gas`
       */
      gasLimit?: string;
      gas?: never;
      to?: string;
      value?: string;
      data?: string;
      input?: never;
      v: string;
      r: string;
      s: string;
    }
  | {
      from?: string;
      nonce: string;
      gasPrice?: string;
      gas?: string;
      gasLimit?: never;
      to?: string;
      value?: string;
      /**
       * Alias for `data`
       */
      input?: string;
      data?: never;
      v: string;
      r: string;
      s: string;
    }
  | {
      from?: string;
      nonce: string;
      gasPrice?: string;
      /**
       * Alias for `gas`
       */
      gasLimit?: string;
      gas?: never;
      to?: string;
      value?: string;
      /**
       * Alias for `data`
       */
      input?: string;
      data?: never;
      v: string;
      r: string;
      s: string;
    };
