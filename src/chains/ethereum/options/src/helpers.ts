import { Hardfork } from "./chain-options"
import { KnownNetworks } from "./fork-options"

export const getDefaultForkByNetwork = (network : KnownNetworks) : Hardfork => {
    switch(network){
        case "mainnet" : return "grayGlacier"
        case "sepolia" : return "london"
        case "goerli" : return "london"
        case "görli" : return "london"
        default : return "london"
    }
}

export const normalize = <T>(rawInput: T) => rawInput;
