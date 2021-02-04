/// <reference types="node" />
import { SerializableLiteral } from "./serializable-literal";
import { StartDealParams } from "./start-deal-params";
import { utils } from "@ganache/utils";
import { Message } from "./message";
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
  Mainnet = "f",
  Unknown = "UNKNOWN"
}
declare class Address extends SerializableLiteral<AddressConfig> {
  #private;
  get config(): {};
  static readonly CHECKSUM_BYTES = 4;
  get privateKey(): string | undefined;
  get network(): AddressNetwork;
  get protocol(): AddressProtocol;
  constructor(publicAddress: string, privateKey?: string);
  setPrivateKey(privateKey: string): void;
  signProposal(proposal: StartDealParams): Promise<Buffer>;
  signMessage(message: Message): Promise<Buffer>;
  signBuffer(buffer: Buffer): Promise<Buffer>;
  static recoverPublicKey(address: string): Buffer;
  static fromPrivateKey(
    privateKey: string,
    protocol?: AddressProtocol,
    network?: AddressNetwork
  ): Address;
  static random(
    rng?: utils.RandomNumberGenerator,
    protocol?: AddressProtocol,
    network?: AddressNetwork
  ): Address;
  static isValid(value: string): boolean;
  static parseNetwork(publicAddress: string): AddressNetwork;
  static parseProtocol(publicAddress: string): AddressProtocol;
}
declare type SerializedAddress = string;
export { Address, SerializedAddress, AddressProtocol };
