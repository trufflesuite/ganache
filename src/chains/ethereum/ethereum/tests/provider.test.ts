import assert from "assert";
import { join } from "path";
import Transaction from "@ethereumjs/tx/dist/legacyTransaction";
import { Data, JsonRpcRequest } from "@ganache/utils";
import Common from "@ethereumjs/common";
import { EthereumProvider } from "../src/provider";
import EthereumApi from "../src/api";
import getProvider from "./helpers/getProvider";
import compile from "./helpers/compile";
import Web3 from "web3";

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
      await assert.rejects(async () => {
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
      let transaction: { from: string; data: string; gasLimit: string };
      let controlEvents: [string, any][] = null;
      let deploymentHash: string;
      beforeEach(async () => {
        [from] = await provider.send("eth_accounts");
        contract = compile(join(__dirname, "./contracts/DebugStorage.sol"));
        transaction = {
          from,
          data: contract.code,
          gasLimit: "0x2fefd8"
        };
        const subId = await provider.send("eth_subscribe", ["newHeads"]);
        controlEvents = await testEvents(async () => {
          deploymentHash = await provider.send("eth_sendTransaction", [
            transaction
          ]);
          await provider.once("message");
          await provider.send("eth_unsubscribe", [subId]);
        });
      });
      async function testEvents(
        transactionFunction: any,
        controlEvents: any = null
      ) {
        let context: {};
        const events: [string, any][] = [];
        const unsubscribeBefore = provider.on("ganache:vm:tx:before", event => {
          context = event.context;

          assert.notStrictEqual(event.context, null);
          assert.notStrictEqual(event.context, undefined);
          assert.strictEqual(typeof event.context, "object");
          events.push(["ganache:vm:tx:before", event]);
        });
        const unsubscribeStep = provider.on("ganache:vm:tx:step", event => {
          assert.strictEqual(event.context, context);
          assert.strictEqual(typeof event.data.opcode.name, "string");

          // delete some the data that may change in between runs:
          assert.strictEqual(event.data.address.length, 20);
          assert.strictEqual(event.data.codeAddress.length, 20);
          assert.strictEqual(event.data.account.codeHash.length, 32);
          assert.strictEqual(event.data.account.stateRoot.length, 32);
          assert.strictEqual(typeof event.data.account.nonce, "bigint");
          assert.strictEqual(typeof event.data.account.balance, "bigint");

          delete event.data.address;
          delete event.data.codeAddress;
          delete event.data.account;

          events.push(["ganache:vm:tx:step", event]);
        });
        const unsubscribeAfter = provider.on("ganache:vm:tx:after", event => {
          assert.strictEqual(event.context, context);
          events.push(["ganache:vm:tx:after", event]);
        });

        await transactionFunction();

        unsubscribeBefore();
        unsubscribeStep();
        unsubscribeAfter();

        assert(events.length > 2, "missing expected events");

        // this function is used to collect the `controlEvents` that all other
        // tests rely on
        if (controlEvents !== null) {
          assert.deepStrictEqual(
            events,
            controlEvents,
            "events don't match from expected/control to actual"
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
        }, controlEvents);
      });
      it("emits vm:tx:* events for eth_call", async () => {
        await testEvents(async () => {
          await provider.send("eth_call", [transaction]);
        }, controlEvents);
      });
      it("emits vm:tx:* events for eth_sendRawTransaction", async () => {
        const accounts = provider.getInitialAccounts();
        const gasPrice = await provider.send("eth_gasPrice", []);
        const secretKey = Data.from(accounts[from].secretKey).toBuffer();
        const tx = Transaction.fromTxData(
          // specify gasPrice so we don't have to deal with a type 2 transaction
          { ...transaction, nonce: "0x1", gasPrice },
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
        }, controlEvents);
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
        }, controlEvents);
      });
      it("emits vm:tx:* events for debug_traceTransaction", async () => {
        const subId = await provider.send("eth_subscribe", ["newHeads"]);
        const hash = await provider.send("eth_sendTransaction", [transaction]);
        await provider.once("message");
        await provider.send("eth_unsubscribe", [subId]);

        await testEvents(async () => {
          await provider.send("debug_traceTransaction", [hash]);
        }, controlEvents);
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

    it("asserts invalid arg lengths", async () => {
      await assert.rejects(
        () =>
          provider.request({
            method: "eth_accounts",
            params: ["invalid arg"] as any
          }),
        {
          message:
            "Incorrect number of arguments. 'eth_accounts' requires exactly 0 arguments."
        }
      );
      await assert.rejects(
        () =>
          provider.request({
            method: "eth_getBlockByNumber",
            params: [] as any
          }),
        {
          message:
            "Incorrect number of arguments. 'eth_getBlockByNumber' requires between 1 and 2 arguments."
        }
      );
      await assert.rejects(
        () =>
          provider.request({
            method: "eth_getBlockTransactionCountByNumber",
            params: [] as any
          }),
        {
          message:
            "Incorrect number of arguments. 'eth_getBlockTransactionCountByNumber' requires exactly 1 argument."
        }
      );
    });
  });

  describe("web3 compatibility", () => {
    let provider: EthereumProvider;
    let web3: Web3;
    let accounts: string[];

    beforeEach(async () => {
      provider = await getProvider();
      web3 = new Web3();
      // TODO: remove "as any" once we've fixed our typing issues
      // with web3 (https://github.com/ChainSafe/web3.js/pull/4761)
      web3.setProvider(provider as any);
      accounts = await web3.eth.getAccounts();
    });

    it("returns things via legacy", async () => {
      let subscriptionId = "";
      let hash = "";
      const subscription = web3.eth
        .subscribe("newBlockHeaders")
        .on("connected", id => {
          subscriptionId = id;
        })
        .on("data", data => {
          // if the data isn't properly serialized before emitting, web3 won't
          // ever emit "data", so we won't get here
          hash = data.hash;
        });

      const tx = { from: accounts[0], gas: "0xfffff" };
      await web3.eth.sendTransaction(tx);

      assert(subscription != null);
      assert.deepStrictEqual(subscriptionId, "0x1");
      assert.notStrictEqual(hash, "");
    });
  });
});
