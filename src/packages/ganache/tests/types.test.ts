import { EthereumProvider } from "../";

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

type TuplifyUnion<
  T,
  L = LastOf<T>,
  N = [T] extends [never] ? true : false
  > = true extends N ? [] : Push<TuplifyUnion<Exclude<T, L>>, L>;

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

declare const expectMethod: <
  MethodName extends Method,
  ExpectedType extends ReturnTypeFor<MethodName>,
  ExpectedUnionSize extends UnionLengthFor<MethodName> extends TuplifyUnion<ExpectedType>["length"]
  ? UnionLengthFor<MethodName>
  : `Size of union for ExpectedType (${TuplifyUnion<ExpectedType>["length"] & number}) and Method (${UnionLengthFor<MethodName>}) don't match`
  >() => void;

describe("types", () => {
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
});
