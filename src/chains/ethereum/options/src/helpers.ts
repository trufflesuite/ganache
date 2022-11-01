import { Hardfork } from "./chain-options";
import { KnownNetworks } from "./fork-options";

export const getDefaultForkByNetwork = (network: KnownNetworks): Hardfork => {
  switch (network) {
    case "mainnet":
      return "grayGlacier";
    default:
      return "london";
  }
};

export const normalize = <T>(rawInput: T) => rawInput;
