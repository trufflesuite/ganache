import { Hardfork } from "./chain-options";

export const getDefaultForkByNetwork = (network: string): Hardfork => {
  switch (network) {
    case "mainnet":
      return "grayGlacier";
    default:
      return "london";
  }
};

export const normalize = <T>(rawInput: T) => rawInput;
