import assert from "assert";
import EthereumProvider from "../src/provider";
import getProvider from "./helpers/getProvider";
import { Data, JsonRpcRequest } from "@ganache/utils";
import EthereumApi from "../src/api";
import compile from "./helpers/compile";
import { join } from "path";
import Transaction from "@ethereumjs/tx/dist/legacyTransaction";
import Common from "@ethereumjs/common";

describe("provider", () => {
  describe("options", () => {
    it("generates predictable accounts when given a seed", async () => {
      const provider = await getProvider({ wallet: { seed: "temet nosce" } });
      const accounts = await provider.send("eth_accounts");
      assert.strictEqual(
        accounts[0],
        "0x59ef313e6ee26bab6bcb1b5694e59613debd88da"
      );
    });

    it("errors when conflicting options are passed to the provider", async () => {
      assert.rejects(async () => {
        await getProvider({
          wallet: {
            deterministic: true,
            seed: "123"
          } as Object // "as Object" lets us get around ts typechecking during compilation
        });
      });
    });
  });

  describe("interface", () => {
    const networkId = 1234;
    let provider: EthereumProvider;

    beforeEach(async () => {
      provider = await getProvider({ chain: { networkId } });
    });

    describe("ganache:vm:tx:* events", () => {
      let from: string;
      let contract: ReturnType<typeof compile>;
      let transaction;
      let controlEvents: [string, any][];
      beforeEach(async () => {
        [from] = await provider.send("eth_accounts");
        contract = compile(join(__dirname, "./contracts/Simple.sol"));
        transaction = {
          from,
          data: contract.code,
          gasLimit: "0x2fefd8"
        };
        const subId = await provider.send("eth_subscribe", ["newHeads"]);
        controlEvents = await testEvents(async () => {
          await provider.send("eth_sendTransaction", [transaction]);
          await provider.once("message");
          await provider.send("eth_unsubscribe", [subId]);
        });
      });
      async function testEvents(transactionFunction: any) {
        let context: {};
        const events: [string, any][] = [];
        const unsubBefore = provider.on("ganache:vm:tx:before", event => {
          context = event.context;

          assert.notStrictEqual(event.context, null);
          assert.notStrictEqual(event.context, undefined);
          assert.strictEqual(typeof event.context, "object");
          events.push(["ganache:vm:tx:before", event]);
        });
        const unSubStep = provider.on("ganache:vm:tx:step", event => {
          assert.strictEqual(event.context, context);
          assert.strictEqual(typeof event.data.opcode.name, "string");
          events.push(["ganache:vm:tx:step", event]);
        });
        const unsubAfter = provider.on("ganache:vm:tx:after", event => {
          assert.strictEqual(event.context, context);
          events.push(["ganache:vm:tx:after", event]);
        });

        await transactionFunction();

        unsubBefore();
        unSubStep();
        unsubAfter();

        assert(events.length > 2, "missing expected events");
        // this function is used to collect the `controlEvents` that all other
        // tests rely on
        if (controlEvents) {
          assert.deepStrictEqual(
            events,
            controlEvents,
            "missing expected events"
          );
        }
        return events;
      }
      it("emits vm:tx:* events for eth_sendTransaction", async () => {
        await testEvents(async () => {
          const subId = await provider.send("eth_subscribe", ["newHeads"]);
          await provider.send("eth_sendTransaction", [transaction]);
          await provider.once("message");
          await provider.send("eth_unsubscribe", [subId]);
        });
      });
      it("emits vm:tx:* events for eth_call", async () => {
        await testEvents(async () => {
          await provider.send("eth_call", [transaction]);
        });
      });
      it("emits vm:tx:* events for eth_sendRawTransaction", async () => {
        const accounts = provider.getInitialAccounts();
        const secretKey = Data.from(accounts[from].secretKey).toBuffer();
        const tx = Transaction.fromTxData(
          { ...transaction, nonce: "0x1" },
          {
            common: Common.forCustomChain("mainnet", { chainId: 1337 })
          }
        );
        const rawTransaction = Data.from(
          tx.sign(secretKey).serialize()
        ).toString();

        await testEvents(async () => {
          const subId = await provider.send("eth_subscribe", ["newHeads"]);
          await provider.send("eth_sendRawTransaction", [rawTransaction]);
          await provider.once("message");
          await provider.send("eth_unsubscribe", [subId]);
        });
      });
      it("emits vm:tx:* events for personal_sendTransaction", async () => {
        await testEvents(async () => {
          const subId = await provider.send("eth_subscribe", ["newHeads"]);
          const accounts = provider.getInitialAccounts();
          const secretKey = Data.from(accounts[from].secretKey).toString();
          const password = "password";
          await provider.send("personal_importRawKey", [secretKey, password]);
          await provider.send("personal_sendTransaction", [
            transaction,
            password
          ]);
          await provider.once("message");
          await provider.send("eth_unsubscribe", [subId]);
        });
      });
      it("emits vm:tx:* events for debug_traceTransaction", async () => {
        const subId = await provider.send("eth_subscribe", ["newHeads"]);
        const hash = await provider.send("eth_sendTransaction", [transaction]);
        await provider.once("message");
        await provider.send("eth_unsubscribe", [subId]);

        await testEvents(async () => {
          const subId = await provider.send("eth_subscribe", ["newHeads"]);
          await provider.send("debug_traceTransaction", [hash]);
          await provider.once("message");
          await provider.send("eth_unsubscribe", [subId]);
        });
      });
      it("emits vm:tx:* events for debug_storageRangeAt", async () => {
        const subId = await provider.send("eth_subscribe", ["newHeads"]);
        const hash = await provider.send("eth_sendTransaction", [transaction]);
        await provider.once("message");
        await provider.send("eth_unsubscribe", [subId]);
        const receipt = await provider.send("eth_getTransactionReceipt", [
          hash
        ]);

        await testEvents(async () => {
          const subId = await provider.send("eth_subscribe", ["newHeads"]);
          await provider.send("debug_storageRangeAt", [
            receipt.blockHash,
            0,
            receipt.contractAddress,
            "0x00",
            2
          ]);
          await provider.once("message");
          await provider.send("eth_unsubscribe", [subId]);
        });
      });
    });

    it("returns things via EIP-1193", async () => {
      assert.strictEqual(await provider.send("net_version"), `${networkId}`);
    });

    it("returns things via legacy", async () => {
      const jsonRpcRequest: JsonRpcRequest<EthereumApi, "net_version"> = {
        id: "1",
        jsonrpc: "2.0",
        method: "net_version"
      };
      const methods = ["send", "sendAsync"] as const;
      return Promise.all(
        methods
          .map(method => {
            return new Promise((resolve, reject) => {
              provider[method](jsonRpcRequest, (err: Error, { result }) => {
                if (err) return reject(err);
                assert.strictEqual(result, `${networkId}`);
                resolve(void 0);
              });
            });
          })
          .map(async prom => {
            assert.strictEqual(await prom, void 0);
          })
      );
    });
  });
});
