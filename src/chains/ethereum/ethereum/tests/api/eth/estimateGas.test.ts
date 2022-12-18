import assert from "assert";
import getProvider from "../../helpers/getProvider";

describe("api", () => {
  describe("eth", () => {
    describe("estimateGas", () => {
      it("shouldn't raise an unhandled rejection when the transaction fails", async () => {
        // see https://github.com/trufflesuite/ganache/pull/4056
        const provider = await getProvider();
        const [from] = await provider.request({
          method: "eth_accounts",
          params: []
        });

        const transaction = {
          from,
          // invalid bytecode
          input: "0x1234"
        };

        let didRaiseUnhandledRejection = false;
        const unhandledRejectionHandler = () =>
          (didRaiseUnhandledRejection = true);
        process.once("unhandledRejection", unhandledRejectionHandler);

        try {
          const estimatingGas = provider.request({
            method: "eth_estimateGas",
            params: [transaction]
          });

          await assert.rejects(estimatingGas);
          await new Promise(resolve => setImmediate(resolve));

          assert(
            didRaiseUnhandledRejection === false,
            "Shouldn't have raised an unhandledRejection"
          );
        } finally {
          process.off("unhandledRejection", unhandledRejectionHandler);
        }
      });
    });
  });
});
