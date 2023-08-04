import { Ethereum } from "../"; // <- same as `from "ganache"`

//#region type helpers
/**
 * Converts a union into an intersection, as long as the types don't collide:
 *
 * ```typescript
 * // this is fine:
 * UnionToIntersection<{prop: string} | {other: boolean}> // `{prop: string;} & {other: boolean;}`
 * ```
 * ```
 * // returns `never`:
 * UnionToIntersection<{prop: string} | {prop: boolean}> // never
 * ```
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

/**
 * Returns only the last item in a Tuple
 */
type LastOf<T> = UnionToIntersection<
  T extends any ? () => T : never
> extends () => infer R
  ? R
  : never;

/**
 * Pushes a new value, V, on to the Tuple, T
 **/
type Push<T extends any[], V> = [...T, V];

/**
 * `TuplifyUnion` splits booleans into [true, false], but we really want to represent that as just `boolean`
 */
type NormalizeBoolean<MaybeBoolean> = MaybeBoolean extends
  | [true, false]
  | [false, true]
  ? [boolean]
  : MaybeBoolean;

/**
 * Convert a Union into a Tuple.
 * example:
 * `"latest" | "earliest" | "pending"` turns into `["latest", "earliest", "pending"]`
 */
type TuplifyUnion<
  U,
  L = LastOf<U>,
  // Done detects if we are done or not, by checking if T exists
  Done = [U] extends [never] ? true : false
> = true extends Done
  ? []
  : NormalizeBoolean<Push<TuplifyUnion<Exclude<U, L>>, L>>;

// mock an instance of our Ethereum provider
const Provider: Ethereum.Provider = {
  // a noop mock `request` method just for testing types
  request: () => {}
} as any;
const MockRequest = Provider.request;

// use the mocked provider instance to extract all its method names
type Method = Parameters<typeof Provider["request"]>[0]["method"];

/**
 * This class provides an entrance into the Provider's types
 */
class Wrapper<M extends Method> {
  // wrapped has no explicit return type so we can infer it
  async wrapped() {
    return await Provider.request<M>({} as any);
  }
}
// Returns the type within the Promise
type UnPromisify<R> = R extends Promise<infer U> ? U : R;
// Returns the method's return type (Promises removed)
type InnerReturnType<M extends Method> = UnPromisify<
  ReturnType<Wrapper<M>["wrapped"]>
>;
// Converts the return type of the method into a union
type ReturnTypeAsTuple<M extends Method> = TuplifyUnion<InnerReturnType<M>>;
// Returns the number of return types for this method
type CountReturnTypes<M extends Method> = ReturnTypeAsTuple<M>["length"] &
  number;

/**
 * expectMethodReturn type checks the return type of the given method
 * It requires all possible types are given at `ExpectedType`.
 *
 * Other `expectType` tests are too loose, in that is the `ExpectedType`
 * _partially_ matches (like unions) the tests still pass.
 *
 * `expectMethodReturn` attempts to check if the types are complete and exact,
 * rather than just "matching":
 *
 * There are certainly cases where `expectMethodReturn` won't work
 */
const expectMethodReturn = function <
  MethodName extends Method,
  ExpectedType extends InnerReturnType<MethodName>,
  ExpectedUnionSize extends CountReturnTypes<MethodName> extends TuplifyUnion<ExpectedType>["length"]
    ? CountReturnTypes<MethodName>
    : `Size of union for ExpectedType (${TuplifyUnion<ExpectedType>["length"] &
        number}) and Method (${CountReturnTypes<MethodName>}) don't match`
>(): void {};
//#endregion types helpers

describe("types", () => {
  it("returns the type for db_putString", async () => {
    expectMethodReturn<"db_putString", boolean, 1>();
  });

  it("return the type for db_getString", () => {
    expectMethodReturn<"db_getString", string, 1>();
  });

  it("return the type for db_putHex", () => {
    expectMethodReturn<"db_putHex", boolean, 1>();
  });

  it("returns the type for eth_sendTransaction", () => {
    expectMethodReturn<"eth_sendTransaction", string, 1>();
  });
  it("returns the type for eth_personalTransaction", () => {
    expectMethodReturn<"personal_sendTransaction", string, 1>();
  });

  it("returns the type for eth_sendRawTransaction", () => {
    expectMethodReturn<"eth_sendRawTransaction", string, 1>();
  });

  it("returns the type for eth_getTransactionByHash", async () => {
    expectMethodReturn<
      "eth_getTransactionByHash",
      Ethereum.Block.Transaction | Ethereum.Pool.Transaction | null,
      4
    >();
  });

  it("returns the type for txpool_content", async () => {
    expectMethodReturn<"txpool_content", Ethereum.Pool.Content, 1>();
  });

  it("returns the type for eth_getTransactionReceipt", async () => {
    expectMethodReturn<
      "eth_getTransactionReceipt",
      Ethereum.Transaction.Receipt,
      1
    >();
  });

  it("returns the type for debug_traceTransaction", async () => {
    expectMethodReturn<
      "debug_traceTransaction",
      Ethereum.TraceTransactionResult,
      1
    >();
  });

  it("returns the type for StorageRangeAtResult", async () => {
    const t: Ethereum.Block.Header = {} as any;
    expectMethodReturn<
      "debug_storageRangeAt",
      Ethereum.StorageRangeAtResult,
      1
    >();
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
    expectMethodReturn<"eth_getBlockByNumber", Ethereum.Block, 1>();
  });

  it("returns the type for eth_getBlockByHash", async () => {
    expectMethodReturn<"eth_getBlockByHash", Ethereum.Block, 1>();
  });

  it("returns the type for evm_mine", async () => {
    expectMethodReturn<"evm_mine", "0x0", 1>();
  });

  it("accepts correct types for evm_mine", async () => {
    MockRequest<"evm_mine">({
      method: "evm_mine",
      params: []
    });
    MockRequest<"evm_mine">({
      method: "evm_mine",
      params: [{ timestamp: 123456, blocks: 1 }]
    });
    MockRequest<"evm_mine">({
      method: "evm_mine",
      params: [{ blocks: 1 }]
    });
    MockRequest<"evm_mine">({
      method: "evm_mine",
      params: [123456]
    });
  });

  it("returns the type for eth_getProof", async () => {
    expectMethodReturn<"eth_getProof", Ethereum.AccountProof, 1>();
  });

  it("accepts correct types for eth_getProof", async () => {
    MockRequest<"eth_getProof">({
      method: "eth_getProof",
      params: ["0x0", ["0x1"], "latest"]
    });
  });
});
