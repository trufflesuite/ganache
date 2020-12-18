import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";

export type ChainConfig = {
  options: {
    /**
     * @default 5001
     */
    readonly ipfsPort: {
      type: number;
      hasDefault: true;
    };
  };
};

export const ChainOptions: Definitions<ChainConfig> = {
  ipfsPort: {
    normalize,
    default: () => 5001
  }
};
