import fc from "fast-check";
import assert from "assert";
import Ganache, { EthereumProvider } from "../../../../packages/core";
import { rawEncode } from "ethereumjs-abi";
import { compile, Contract, LogParams } from "./arbitraries";
import memdown from "memdown";

describe("@ganache/console.log", () => {
  describe("fast-check", () => {
    let logger = {
      log: () => {}
    };
    let provider: EthereumProvider;
    let from: string;

    beforeEach(() => {
      provider = Ganache.provider({
        wallet: { deterministic: true, totalAccounts: 1 },
        logging: { logger },
        // using memdown for performance
        database: { db: memdown() }
      });
      [from] = Object.keys(provider.getInitialAccounts());
    });

    afterEach(async () => {
      provider && (await provider.disconnect());
      provider = null;
    });

    async function deploy(code: string) {
      const transactionHash = await provider.send("eth_sendTransaction", [
        {
          from,
          data: code,
          gas: "0xfffff"
        } as any
      ]);

      const { contractAddress } = await provider.send(
        "eth_getTransactionReceipt",
        [transactionHash]
      );
      return contractAddress;
    }

    function encode(
      params: {
        type: string;
        value: any;
      }[]
    ) {
      return rawEncode(
        params.map(p => p.type.replace(" memory", "")),
        params.map(p =>
          typeof p.value === "bigint" ? `0x${p.value.toString(16)}` : p.value
        )
      );
    }

    async function assertLogsAsync(
      params: {
        type: string;
        value: any;
      }[]
    ) {
      let resolve: (value: void) => void, reject: (reason?: any) => void;
      const deferredPromise = new Promise<void>((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
      });

      // start listening for logs
      logger.log = (...logs: any[]) => {
        // ignore normal log values: "eth_sendTransaction"
        if (logs[0] === "eth_sendTransaction") return;

        const values = encode(params);
        try {
          assert.deepStrictEqual(
            logs,
            params.map(p => p.value)
          );
          resolve();
        } catch (e) {
          console.log(logs, values, params);
          return void reject(e);
        } finally {
          logger.log = () => {};
        }
      };
      return deferredPromise;
    }

    it("logs expected values for combinator signatures", async () => {
      await fc.assert(
        fc.asyncProperty(LogParams(), async params => {
          const snapshotId = await provider.request({
            method: "evm_snapshot",
            params: []
          });
          try {
            const source = Contract(params);
            const { code, contract } = compile(source);
            const contractAddress = await deploy(code);
            const method = Object.values(contract.evm.methodIdentifiers)[0];

            const values = encode(params);

            const deferredPromise = assertLogsAsync(params);
            await provider.send("eth_sendTransaction", [
              {
                from,
                to: contractAddress,
                data: "0x" + method + values.toString("hex")
              }
            ]);
            await deferredPromise;
          } finally {
            await provider.request({
              method: "evm_revert",
              params: [snapshotId]
            });
          }
        }),
        {
          endOnFailure: true
        }
      );
    }).timeout(0);
  });
});
