import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";

export type Hardfork =
  | "constantinople"
  | "byzantium"
  | "petersburg"
  | "istanbul"
  | "muirGlacier";

export type ChainConfig = {
  options: {
    /**
     * Allows unlimited contract sizes while debugging. By setting this to
     * `true`, the check within the EVM for a contract size limit of 24KB (see
     * [EIP-170](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-170.md))
     * is bypassed. Setting this to `true` will cause ganache to behave
     * differently than production environments. You should only set this to
     * `true` during local debugging.
     *
     * @default false
     */
    readonly allowUnlimitedContractSize: {
      type: boolean;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use chain.allowUnlimitedContractSize instead
         */
        allowUnlimitedContractSize: boolean;
      };
    };

    /**
     * When set to `false` only one request will be processed at a time.
     *
     * @default true
     */
    readonly asyncRequestProcessing: {
      type: boolean;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use chain.asyncRequestProcessing instead
         */
        asyncRequestProcessing: boolean;
      };
    };

    /**
     * The currently configured chain id, a value used in replay-protected
     * transaction signing as introduced by
     * [EIP-155](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md).
     *
     * @default 1337
     */
    readonly chainId: {
      type: number;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use chain.chainId instead
         */
        chainId: number;
      };
    };

    /**
     * The id of the network returned by the RPC method `net_version`.
     *
     * Defaults to the current timestamp, via JavaScript's `Date.now()` (the
     * number of millisconds since the UNIX epoch).
     *
     * @default Date.now()
     */
    readonly networkId: {
      type: number;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use chain.networkId instead
         */
        networkId: number;
      };
    };

    /**
     * Date that the first block should start. Use this feature, along with the
     * `evm_increaseTime` RPC, to test time-dependent code.
     */
    readonly time: {
      type: number | Date;
      legacy: {
        /**
         * @deprecated Use chain.time instead
         */
        time: number | Date;
      };
    };

    /**
     * Set the hardfork rules for the EVM.
     * @default "muirGlacier"
     */
    readonly hardfork: {
      type: Hardfork;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use chain.hardfork instead
         */
        hardfork: Hardfork;
      };
    };

    /**
     * Whether to report runtime errors from EVM code as RPC errors.
     *
     * @default false
     */
    readonly vmErrorsOnRPCResponse: {
      type: boolean;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use chain.vmErrorsOnRPCResponse instead
         */
        vmErrorsOnRPCResponse: boolean;
      };
    };
  };
};

export const ChainOptions: Definitions<ChainConfig> = {
  allowUnlimitedContractSize: {
    normalize,
    default: () => false,
    legacyName: "allowUnlimitedContractSize"
  },
  asyncRequestProcessing: {
    normalize,
    default: () => true,
    legacyName: "asyncRequestProcessing"
  },
  chainId: {
    normalize,
    default: () => 1337,
    legacyName: "chainId"
  },
  networkId: {
    normalize,
    default: () => Date.now(),
    legacyName: "networkId"
  },
  time: {
    normalize,
    legacyName: "time"
  },
  hardfork: {
    normalize,
    default: () => "muirGlacier",
    legacyName: "hardfork"
  },
  vmErrorsOnRPCResponse: {
    normalize,
    default: () => false,
    legacyName: "vmErrorsOnRPCResponse"
  }
};
