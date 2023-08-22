import { AccessList } from "./access-lists";

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

export type Transaction =
  | LegacyRpcTransaction
  | EIP2930AccessListRpcTransaction
  | EIP1559FeeMarketRpcTransaction;

export enum TransactionType {
  Legacy = 0x0,
  EIP2930AccessList = 0x1,
  //todo: this should be EIP1559FeeMarket
  //https://github.com/trufflesuite/ganache/issues/4462
  EIP1559AccessList = 0x2
}

export type CallTransaction = Omit<Transaction, "from"> & { from?: string };

export type LegacyRpcTransaction = Readonly<RpcTransaction> & {
  readonly gasPrice?: string;
  readonly chainId?: never;
  readonly accessList?: never;
  readonly maxPriorityFeePerGas?: never;
  readonly maxFeePerGas?: never;
};
export type EIP2930AccessListRpcTransaction = Readonly<RpcTransaction> & {
  readonly type?: TxType;
  readonly chainId?: string;
  readonly gasPrice?: string;
  readonly accessList?: AccessList;
  readonly maxPriorityFeePerGas?: never;
  readonly maxFeePerGas?: never;
};

export type EIP1559FeeMarketRpcTransaction = Readonly<RpcTransaction> & {
  readonly type?: TxType;
  readonly chainId?: string;
  readonly gasPrice?: never;
  readonly maxPriorityFeePerGas?: string;
  readonly maxFeePerGas?: string;
  readonly accessList?: AccessList;
};

export type RpcTransaction =
  | {
      from: string;
      nonce?: string;
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
