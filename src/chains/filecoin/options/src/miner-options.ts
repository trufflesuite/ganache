import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";

export type MinerConfig = {
  options: {
    /**
     * Sets the `blockTime` in seconds for automatic mining. A blockTime of `0`
     * (default) enables "instamine mode", where new executable transactions
     * will be mined instantly.
     *
     * Using the `blockTime` option is discouraged unless you have tests which
     * require a specific mining interval.
     *
     * @default 0 // "instamine mode"
     */
    blockTime: {
      type: number;
      hasDefault: true;
    };
  };
};

export const MinerOptions: Definitions<MinerConfig> = {
  blockTime: {
    normalize: rawInput => {
      if (rawInput < 0) {
        throw new Error("miner.blockTime must be 0 or a positive number.");
      }

      return rawInput;
    },
    cliDescription:
      'Sets the `blockTime` in seconds for automatic mining. A blockTime of `0`  enables "instamine mode", where new executable transactions will be mined instantly.',
    default: () => 0,
    cliType: "number"
  }
};
