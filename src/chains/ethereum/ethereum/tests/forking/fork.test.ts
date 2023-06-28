import { EthereumOptionsConfig } from "@ganache/ethereum-options";
import { Fork } from "../../src/forking/fork";
import { KNOWN_CHAINIDS, Quantity } from "@ganache/utils";
import { Common } from "@ethereumjs/common/dist/common";
import ganache from "../../../../../packages/core";
import Server from "../../../../../packages/core/lib/src/server";
import assert from "assert";
import { logging } from "./helpers";

describe("Fork", () => {
  const PORT = 9999;
  const NETWORK_ID = 1;
  const ACCOUNTS = [];
  const FORK_OPTIONS = {
    fork: {
      url: `http://localhost:${PORT}`
    },
    logging
  };

  let remoteServer: Server;
  let fork: Fork;

  before(async () => {
    remoteServer = ganache.server({
      wallet: { deterministic: true },
      chain: { networkId: NETWORK_ID },
      logging
    });
    await remoteServer.listen(PORT);
  });

  beforeEach(async () => {
    const providerOptions = EthereumOptionsConfig.normalize(FORK_OPTIONS);
    fork = new Fork(providerOptions, ACCOUNTS);
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
          // skip kovan, because it is no longer supported by ethereumjs
          // todo: should we remove 42 from the list of known chainIds?
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

      // ensure that the fork blockNumber is after the merge blockNumber
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
          number, // the block at which paris is scheduled
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

      // ensure that the fork blockNumber is after the mergeForkIdTransition blockNumber
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
