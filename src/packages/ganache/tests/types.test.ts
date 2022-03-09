import { EthereumProvider } from "../";

//#region type helpers
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

type LastOf<T> = UnionToIntersection<
  T extends any ? () => T : never
> extends () => infer R
  ? R
  : never;

type Push<T extends any[], V> = [...T, V];

/**
 * `TuplifyUnion` splits booleans into [true, false], but we really want to represent that as just `boolean`
 */
type NormalizeBoolean<T> = T extends [true, false] | [false, true] ? [boolean] : T;

type TuplifyUnion<
  T,
  L = LastOf<T>,
  N = [T] extends [never] ? true : false
  > = true extends N ? [] : NormalizeBoolean<Push<TuplifyUnion<Exclude<T, L>>, L>>;

declare const Provider: typeof EthereumProvider;
type Method = Parameters<EthereumProvider["request"]>[0]["method"];

class Wrapper<T extends Method> {
  // wrapped has no explicit return type so we can infer it
  async wrapped() {
    return await Provider.prototype.request<T>({} as any);
  }
}
type UnPromisify<T> = T extends Promise<infer U> ? U : T;
type ReturnTypeFor<T extends Method> = UnPromisify<
  ReturnType<Wrapper<T>["wrapped"]>
>;
type UnionFor<T extends Method> = TuplifyUnion<ReturnTypeFor<T>>;
type UnionLengthFor<T extends Method> = UnionFor<T>["length"] & number;

const expectMethod = function <
  MethodName extends Method,
  ExpectedType extends ReturnTypeFor<MethodName>,
  ExpectedUnionSize extends UnionLengthFor<MethodName> extends TuplifyUnion<ExpectedType>["length"]
  ? UnionLengthFor<MethodName>
  : `Size of union for ExpectedType (${TuplifyUnion<ExpectedType>["length"] & number}) and Method (${UnionLengthFor<MethodName>}) don't match`
>(): void { };
//#endregion types helpers

describe("types", () => {
  it("returns the type for db_putString", async () => {
    expectMethod<"db_putString", boolean, 1>();
  });

  it("return the type for db_getString", () => {
    expectMethod<"db_getString", string, 1>();
  });

  it("return the type for db_putHex", () => {
    expectMethod<"db_putHex", boolean, 1>();
  });

  it("returns the type for eth_sendTransaction", () => {
    expectMethod<"eth_sendTransaction", string, 1>();
  });

  it("returns the type for eth_personalTransaction", () => {
    expectMethod<"personal_sendTransaction", string, 1>();
  });

  it("returns the type for eth_sendRawTransaction", () => {
    expectMethod<"eth_sendRawTransaction", string, 1>();
  });

  it("returns the type for eth_getTransactionByHash", async () => {
    type BaseExpectedTypes = {
      hash: string;
      type?: string;
      nonce: string;
      blockHash: string;
      blockNumber: string;
      transactionIndex: string;
      from: string;
      to: string;
      value: string;
      gas: string;
      gasPrice: string;
      input: string;
      v: string;
      r: string;
      s: string;
    } | {
      hash: string;
      type: string;
      chainId: string;
      nonce: string;
      blockHash: string;
      blockNumber: string;
      transactionIndex: string;
      from: string;
      to: string;
      value: string;
      gas: string;
      gasPrice: string;
      input: string;
      accessList: string[];
      v: string;
      r: string;
      s: string;
    } | {
      hash: string;
      type: string;
      chainId: string;
      nonce: string;
      blockHash: string;
      blockNumber: string;
      transactionIndex: string;
      from: string;
      to: string;
      value: string;
      maxPriorityFeePerGas: string;
      maxFeePerGas: string;
      gasPrice: string;
      gas: string;
      input: string;
      accessList: string[];
      v: string;
      r: string;
      s: string;
    };
    type ExpectedType = BaseExpectedTypes | Omit<BaseExpectedTypes, "blockNumber" | "blockHash" | "transactionIndex"
    > & {
      blockNumber: null;
      blockHash: null;
      transactionIndex: null;
    };

    expectMethod<"eth_getTransactionByHash", ExpectedType, 4>();
  });

  it("returns the type for eth_getTransactionReceipt", async () => {
    type ExpectedType = {
      transactionHash: string;
      transactionIndex: string;
      blockNumber: string;
      blockHash: string;
      from: string;
      to: string;
      cumulativeGasUsed: string;
      gasUsed: string;
      contractAddress: string;
      logs: {
        address: string;
        blockHash: string;
        blockNumber: string;
        data: string | string[];
        logIndex: string;
        removed: boolean;
        topics: string | string[];
        transactionHash: string;
        transactionIndex: string;
      }[];
      logsBloom: string;
      status: string;
      type?: string;
      chainId?: string;
      accessList?: {
        address: string
        storageKeys: string[]
      }[];
      effectiveGasPrice: string;
    };

    expectMethod<"eth_getTransactionReceipt", ExpectedType, 1>();
  });
});
