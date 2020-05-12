import {types} from "@ganache/utils";
import TezosConnector from "@ganache/tezos";
import EthereumConnector from "@ganache/ethereum";

export const FlavorMap = {
  tezos: TezosConnector,
  ethereum: EthereumConnector
};

export type FlavorMap = {
  tezos: TezosConnector;
  ethereum: EthereumConnector;
};

export type Flavors = {
  [k in keyof FlavorMap]: FlavorMap[k];
}[keyof FlavorMap];

export type Apis<T extends Flavors = Flavors> = T extends types.Connector<infer R> ? R : never;
