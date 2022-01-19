import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";

export type MinerConfig = {
  options: {
    /**
     * Sets the `blockTime` in seconds for automatic mining. A `blockTime` of `0`
     * (default) or a negative number enables "instamine mode", where new executable transactions
     * will be mined instantly.
     *
     * Using the `blockTime` option is discouraged unless you have tests which
     * require a specific mining interval.
     *
     * @defaultValue 0 // "instamine mode"
     */
    blockTime: {
      type: number;
      hasDefault: true;
    };

    /**
     * Enable mining. Set to `false` to pause the miner. If set to `false`,
     * calling `Ganache.MineTipset` method will still mine a tipset/block.
     *
     * Call `Ganache.EnableMiner` or `Ganache.DisableMiner` to enable/disable
     * during runtime.
     *
     * @defaultValue true
     */
    mine: {
      type: boolean;
      hasDefault: true;
    };
  };
};

export const MinerOptions: Definitions<MinerConfig> = {
  blockTime: {
    normalize: value => Math.max(0, value),
    cliDescription:
      'Sets the `blockTime` in seconds for automatic mining. A `blockTime` of `0` or a negative number enables "instamine mode", where new executable transactions will be mined instantly.',
    default: () => 0,
    cliType: "number"
  },
  mine: {
    normalize,
    cliDescription: "Enable mining. Set to `false` to pause the miner.",
    default: () => true,
    cliType: "boolean"
  }
};
