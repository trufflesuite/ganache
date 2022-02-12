import { expectType } from "tsd";
import { EthereumProvider } from "../";

declare const Provider: typeof EthereumProvider;
type Method = Parameters<EthereumProvider["request"]>[0]["method"];

class Wrapper<T extends Method> {
  // wrapped has no explicit return type so we can infer it
  async wrapped() {
    return await Provider.prototype.request<T>({} as any);
  }
}
type UnPromisify<T> = T extends Promise<infer U> ? U : T;

type ReturnTypeFor<T extends Method> = UnPromisify<ReturnType<Wrapper<T>["wrapped"]>>;

describe("types", () => {
  it("returns the type for eth_sendTransaction", () => {
    expectType<string>({} as ReturnTypeFor<"eth_sendTransaction">);
  });
  it("returns the type for eth_personalTransaction", () => {
    expectType<string>(
      {} as ReturnTypeFor<"personal_sendTransaction">
    );
  });
  it("returns the type for eth_sendRawTransaction", () => {
    expectType<string>({} as ReturnTypeFor<"eth_sendRawTransaction">);
  });
  it("returns the type for eth_getTransactionByHash", async () => {
    type RetType = ReturnTypeFor<"eth_getTransactionByHash">
    expectType<
      {
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
      }
    >({} as ReturnTypeFor<"eth_getTransactionByHash">);
  });
});
