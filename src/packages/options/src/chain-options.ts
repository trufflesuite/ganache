
import EthereumOptions from "./chains/ethereum";
import TezosOptions from "./chains/tezos";
import FilecoinOptions from "./chains/filecoin";

export {
  EthereumOptions,
  TezosOptions,
  FilecoinOptions
}

// Add a new chain flavor and options to this type list
type ChainOptions = {
  tezos: TezosOptions;
  filecoin: FilecoinOptions;
  ethereum: EthereumOptions;
}

// FlavoredChainOptions adds on the expected flavor property for each chain option type
type FlavoredChainOptions = {
  [flavor in keyof ChainOptions]: ChainOptions[flavor] & {flavor: flavor}
}

type UnionTypes<O, P extends keyof O = keyof O> = O[P];

// Here, we ditch the properties and just union all the types, both
// for regular options and flavored options.
type Options = UnionTypes<ChainOptions>
type FlavoredOptions = UnionTypes<FlavoredChainOptions> 

export {
  Options,
  FlavoredOptions
};