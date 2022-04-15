import { Ethereum, EthereumProvider } from "../"; // <- same as `from "ganache"`


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

  // Monday, more like 
  // Tuesday? More like 

  it("returns the type for eth_personalTransaction", () => {
    expectMethod<"personal_sendTransaction", string, 1>();
  });

  it("returns the type for eth_sendRawTransaction", () => {
    expectMethod<"eth_sendRawTransaction", string, 1>();
  });

  it("returns the type for eth_getTransactionByHash", async () => {
    expectMethod<"eth_getTransactionByHash", Ethereum.SignedTransaction | Ethereum.PooledTransaction | null, 4>();
  });

  it("returns the type for txpool_content", async () => {
    expectMethod<"txpool_content", Ethereum.TransactionPoolContent, 1>();
  });

  it("returns the type for eth_getTransactionReceipt", async () => {
    expectMethod<"eth_getTransactionReceipt", Ethereum.TransactionReceipt, 1>();
  });

  it("returns the type for debug_traceTransaction", async () => {
    expectMethod<"debug_traceTransaction", Ethereum.TraceTransactionResult, 1>();
  });

  it("returns the type for StorageRangeAtResult", async () => {
    expectMethod<"debug_storageRangeAt", Ethereum.StorageRangeAtResult, 1>();
  });

  it("returns the type for eth_getBlockByNumber", async () => {
    // eth_getBlockByHash (and eth_getBlockByNumber) return a different type
    // based on the arguments passed in, specifically the second argument:
    // `includeTransactions`. TypeScript currently isn't capable of supporting
    // the the Polymorphic type the way we need it to, but TypeScript 4.7.0 will
    // support it. Once 4.7.0 is released we should be able to modify our types
    // to handle the polymorphism. Note: this will require we update the way we
    // test types, as `expectMethod` doesn't care about the arguments passed in.
    // see: https://github.com/trufflesuite/ganache/issues/2907
    expectMethod<"eth_getBlockByNumber", Ethereum.Block, 1>();
  });

  it("returns the type for eth_getBlockByHash", async () => {
    expectMethod<"eth_getBlockByHash", Ethereum.Block, 1>();
  });
});
