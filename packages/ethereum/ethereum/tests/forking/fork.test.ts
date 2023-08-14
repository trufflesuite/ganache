import { EthereumOptionsConfig } from "@ganache/ethereum-options";
import { Fork } from "../../src/forking/fork";
import { KNOWN_CHAINIDS, Quantity } from "@ganache/utils";
import { Common } from "@ethereumjs/common/dist/common";
import ganache from "../../../../../packages/core";
import Server from "../../../../../packages/core/lib/src/server";
import assert from "assert";
import { logging } from "./helpers";

describe("Fork", () => {
  const port = 9999;
  const networkId = 1;
  const accounts = [];
  const forkOptions = {
    fork: {
      url: `http://localhost:${port}`
    },
    logging
  };

  let remoteServer: Server;
  let fork: Fork;

  before(async () => {
    remoteServer = ganache.server({
      wallet: { deterministic: true },
      chain: { networkId: networkId },
      logging
    });
    await remoteServer.listen(port);
  });

  beforeEach(async () => {
    const providerOptions = EthereumOptionsConfig.normalize(forkOptions);
    fork = new Fork(providerOptions, accounts);
    await fork.initialize();
  });

  afterEach(async () => {
    await fork.close();
  });

  after(async () => {
    await remoteServer.close();
  });

  describe("getCommonForBlock()", () => {
    it("should return a Common for known chainIds", () => {
      KNOWN_CHAINIDS.forEach(chainId => {
        if (chainId === 42) {
          // Skip kovan, because it is no longer supported by ethereumjs. To be
          // removed in https://github.com/trufflesuite/ganache/issues/4461
        } else {
          assert.doesNotThrow(() => {
            const parentCommon = new Common({ chain: chainId });

            fork.getCommonForBlock(parentCommon, {
              number: 0n,
              timestamp: 0n
            });
          });
        }
      });
    });

    it("should resolve the correct hardfork based on block number for known chainId", () => {
      const mainnet = 1;
      const mergeBlocknumber = 15537394n;

      // ensure that the "fork" blockNumber is after the "merge" hardfork blockNumber
      fork.blockNumber = Quantity.from(mergeBlocknumber + 100n);
      fork.chainId = mainnet;

      const parentCommon = new Common({ chain: mainnet });
      const blocknumberToHardfork: [bigint, string][] = [
        [mergeBlocknumber - 1n, "grayGlacier"],
        [mergeBlocknumber, "merge"],
        [mergeBlocknumber + 1n, "merge"]
      ];

      blocknumberToHardfork.forEach(([number, expectedHardfork]) => {
        const common = fork.getCommonForBlock(parentCommon, {
          number,
          timestamp: 0n
        });

        const hf = common.hardfork();

        assert.strictEqual(
          hf,
          expectedHardfork,
          `Unexpected hardfork with blocknumber: ${number}`
        );
      });
    });

    it("should resolve the correct hardfork based on timestamp for known chainId", () => {
      // we use sepolia because it has shanghai hf scheduled
      const sepolia = 11155111;
      const shanghaiTimestamp = 1677557088n;
      const mergeForkIdTransitionBlockNumber = 1735371n;

      // ensure that the "fork" blockNumber is after the "mergeForkIdTransition" hardfork blockNumber
      fork.blockNumber = Quantity.from(mergeForkIdTransitionBlockNumber + 100n);
      fork.chainId = sepolia;

      const timstampToHardfork: [bigint, string][] = [
        [shanghaiTimestamp - 1n, "mergeForkIdTransition"],
        [shanghaiTimestamp, "shanghai"],
        [shanghaiTimestamp + 1n, "shanghai"]
      ];

      const parentCommon = new Common({ chain: sepolia });
      timstampToHardfork.forEach(([timestamp, expectedHardfork]) => {
        const common = fork.getCommonForBlock(parentCommon, {
          number: mergeForkIdTransitionBlockNumber,
          timestamp
        });

        const hf = common.hardfork();

        assert.strictEqual(
          hf,
          expectedHardfork,
          `Unexpected hardfork with timestamp: ${timestamp}`
        );
      });
    });
  });
});
