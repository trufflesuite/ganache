/// <reference types="node" />
import { SerializableLiteral } from "./serializable-literal";
import { StorageProposal } from "./storage-proposal";
interface AddressConfig {
  type: string;
}
declare enum AddressProtocol {
  ID = 0,
  SECP256K1 = 1,
  Actor = 2,
  BLS = 3,
  Unknown = 255
}
declare enum AddressNetwork {
  Testnet = "t",
  Mainnet = "m"
}
declare class Address extends SerializableLiteral<AddressConfig> {
  get config(): {
    defaultValue: (literal: any) => any;
  };
  static readonly MAINNET_PREFIX = "f";
  static readonly TESTNET_PREFIX = "t";
  static readonly CHECKSUM_BYTES = 4;
  readonly privateKey: string;
  readonly protocol: AddressProtocol;
  readonly network: AddressNetwork;
  constructor(
    privateKey: string,
    protocol?: AddressProtocol,
    network?: AddressNetwork
  );
  signProposal(proposal: StorageProposal): Promise<Buffer>;
  static fromPrivateKey(
    privateKey: string,
    protocol: AddressProtocol,
    network: AddressNetwork
  ): string;
  static random(
    rng?: () => number,
    protocol?: AddressProtocol,
    network?: AddressNetwork
  ): Address;
  static isValid(value: string): boolean;
}
declare type SerializedAddress = string;
export { Address, SerializedAddress, AddressProtocol };
