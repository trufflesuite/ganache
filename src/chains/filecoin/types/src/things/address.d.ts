/// <reference types="node" />
import { SerializableLiteral } from "./serializable-literal";
import { StartDealParams } from "./start-deal-params";
import { utils } from "@ganache/utils";
import { Message } from "./message";
import { Signature } from "./signature";
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
  static readonly FirstNonSingletonActorId = 100;
  static readonly FirstMinerId = 1000;
  static readonly CHECKSUM_BYTES = 4;
  get privateKey(): string | undefined;
  get network(): AddressNetwork;
  get protocol(): AddressProtocol;
  constructor(publicAddress: string, privateKey?: string);
  setPrivateKey(privateKey: string): void;
  signProposal(proposal: StartDealParams): Promise<Buffer>;
  signMessage(message: Message): Promise<Buffer>;
  signBuffer(buffer: Buffer): Promise<Buffer>;
  static recoverBLSPublicKey(address: string): Buffer;
  static recoverSECP256K1PublicKey(
    signature: Signature,
    message: Uint8Array
  ): Buffer;
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
  /**
   * Creates an AddressProtocol.ID address
   * @param id A positive integer for the id.
   * @param isSingletonSystemActor If false, it adds Address.FirstNonSingletonActorId to the id.
   * Almost always `false`. See https://git.io/JtgqL for examples of singleton system actors.
   * @param network The AddressNetwork prefix for the address; usually AddressNetwork.Testnet for Ganache.
   */
  static fromId(
    id: number,
    isSingletonSystemActor?: boolean,
    isMiner?: boolean,
    network?: AddressNetwork
  ): Address;
}
declare type SerializedAddress = string;
export { Address, SerializedAddress, AddressProtocol };
