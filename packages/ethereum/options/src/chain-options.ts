import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";
import { ArrayToTuple, Writeable } from "./helper-types";

const HARDFORKS = [
  "constantinople",
  "byzantium",
  "petersburg",
  "istanbul",
  "muirGlacier",
  "berlin",
  "london",
  "arrowGlacier",
  "grayGlacier",
  "merge",
  "shanghai"
] as const;

export type Hardfork = Writeable<ArrayToTuple<typeof HARDFORKS>>;

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
     * @defaultValue false
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
     * Allows unlimited initcode (`transaction.data`) while debugging. By
     * setting this to `true`, the check within the EVM for a initcode size
     * limit of 48KB (see [EIP-3860](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-3860.md))
     * is bypassed. Setting this to `true` will cause ganache to behave
     * differently than production environments. You should only set this to
     * `true` during local debugging.
     *
     * @defaultValue false
     */
    readonly allowUnlimitedInitCodeSize: {
      type: boolean;
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
     * @defaultValue 1337
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
     * number of milliseconds since the UNIX epoch).
     *
     * @defaultValue Date.now()
     */
    readonly networkId: {
      type: number;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use chain.networkId instead
         */
        network_id: number;
      };
    };

    /**
     * Date that the first block should start. Use this feature, along with the
     * `evm_increaseTime` RPC, to test time-dependent code.
     */
    readonly time: {
      type: Date | null;
      rawType: Date | string | number;
      legacy: {
        /**
         * @deprecated Use chain.time instead
         */
        time: Date | string;
      };
      cliType: string;
    };

    /**
     * Set the hardfork rules for the EVM.
     * @defaultValue "shanghai"
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
     * @defaultValue false
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
    cliDescription:
      "Allows unlimited contract sizes. Setting this to `true` will cause ganache to behave differently than production environments.",
    default: () => false,
    legacyName: "allowUnlimitedContractSize",
    cliType: "boolean"
  },
  allowUnlimitedInitCodeSize: {
    normalize,
    cliDescription:
      "Allows unlimited initcode (`transaction.data`) sizes. Setting this to `true` will cause ganache to behave differently than production environments.",
    default: () => false,
    cliType: "boolean"
  },
  asyncRequestProcessing: {
    normalize,
    cliDescription:
      "When set to `false` only one request will be processed at a time.",
    default: () => true,
    legacyName: "asyncRequestProcessing",
    cliType: "boolean"
  },
  chainId: {
    normalize,
    cliDescription: "The currently configured chain id.",
    default: () => 1337,
    legacyName: "chainId",
    cliType: "number"
  },
  networkId: {
    normalize,
    cliDescription:
      "The id of the network returned by the RPC method `net_version`.",
    default: () => Date.now(),
    defaultDescription:
      "System time at process start or Network ID of forked blockchain if configured.",
    legacyName: "network_id",
    cliAliases: ["i", "networkId"],
    cliType: "number"
  },
  time: {
    normalize: rawInput => (rawInput !== undefined ? new Date(rawInput) : null),
    cliDescription: "Date that the first block should start.",
    legacyName: "time",
    cliAliases: ["t", "time"],
    cliType: "string",
    cliCoerce: (input: string) => {
      // try parsing the input as a number, if it works use the number
      // otherwise pass the string along
      const asNum = (input as any) / 1;
      if (isNaN(asNum)) {
        return input;
      } else {
        return asNum;
      }
    }
  },
  hardfork: {
    normalize,
    cliDescription: "Set the hardfork rules for the EVM.",
    default: () => "shanghai",
    legacyName: "hardfork",
    cliAliases: ["k", "hardfork"],
    cliType: "string",
    cliChoices: HARDFORKS as Writeable<typeof HARDFORKS>
  },
  vmErrorsOnRPCResponse: {
    normalize,
    cliDescription:
      "Whether to report runtime errors from EVM code as RPC errors.",
    default: () => false,
    legacyName: "vmErrorsOnRPCResponse",
    cliType: "boolean"
  }
};
