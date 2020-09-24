import { Definitions } from "@ganache/options";

export type Hardfork = "constantinople" | "byzantium" | "petersburg" | "istanbul" | "muirGlacier";

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
     * Default is `false`.
     */
    readonly allowUnlimitedContractSize: {
      type: boolean;
      hasDefault: true;
    }
    
    readonly asyncRequestProcessing: {
      type: boolean;
      hasDefault: true;
    }

    /**
     * The currently configured chain id, a value used in replay-protected
     * transaction signing as introduced by
     * [EIP-155](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md).
     * 
     * Defaults to `1337`.
     */
    readonly chainId: {
      type: number;
      hasDefault: true;
    }

    /**
     * The id of the network returned by the RPC method `net_version`.
     * 
     * Defaults to the current timestamp, via JavaScript's `Date.now()` (the 
     * number of millisconds since the UNIX epoch).
     */
    readonly networkId: {
      type: number;
      hasDefault: true;
    }

    /**
     * Date that the first block should start. Use this feature, along with the
     * `evm_increaseTime` RPC, to test time-dependent code.
     */
    readonly time: {
      type: number | Date;
    }

    /**
     * Set the hardfork rules for the EVM.
     */
    readonly hardfork: {
      type: Hardfork;
      hasDefault: true;
    }

    /**
     * Whether to report runtime errors from EVM code as RPC errors.
     * 
     * Defaults to `false`.
     */
    readonly vmErrorsOnRPCResponse: {
      type: boolean;
      hasDefault: true;
    }
  },
  exclusiveGroups: []
}

export const ChainOptions: Definitions<ChainConfig> = {
  allowUnlimitedContractSize: {
    normalize: rawInput => rawInput,
    default: () => false
  },
  asyncRequestProcessing: {
    normalize: rawInput => rawInput,
    default: () => true
  },
  chainId: {
    normalize: rawInput => rawInput,
    default: () => 1337
  },
  networkId: {
    normalize: rawInput => rawInput,
    default: () => Date.now()
  },
  time: {
    normalize: rawInput => rawInput
  },
  hardfork: {
    normalize: rawInput => rawInput,
    default: () => "muirGlacier"
  },
  vmErrorsOnRPCResponse: {
    normalize: rawInput => rawInput,
    default: () => false
  }
};
