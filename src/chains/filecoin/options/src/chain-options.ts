import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";

export type ChainConfig = {
  options: {
    /**
     * The IPFS simulator host name/address to listen on.
     *
     * @defaultValue "127.0.0.1"
     */
    readonly ipfsHost: {
      type: string;
      hasDefault: true;
    };

    /**
     * The IPFS simulator port.
     *
     * @defaultValue 5001
     */
    readonly ipfsPort: {
      type: number;
      hasDefault: true;
    };

    /**
     * When set to `false` only one request will be processed at a time.
     *
     * @defaultValue true
     */
    readonly asyncRequestProcessing: {
      type: boolean;
      hasDefault: true;
    };
  };
};

export const ChainOptions: Definitions<ChainConfig> = {
  ipfsHost: {
    normalize,
    cliDescription: "The IPFS simulator host name/address to listen on.",
    default: () => "127.0.0.1",
    cliType: "string"
  },
  ipfsPort: {
    normalize,
    cliDescription: "The IPFS simulator port.",
    default: () => 5001,
    cliType: "number"
  },
  asyncRequestProcessing: {
    normalize,
    cliDescription:
      "When set to `false` only one request will be processed at a time.",
    default: () => true,
    cliType: "boolean"
  }
};
