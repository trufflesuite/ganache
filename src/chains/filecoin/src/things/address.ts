import { SerializableLiteral } from "./serializable-literal";
import blake from "blakejs";
import * as bls from "noble-bls12-381";
import base32 from "base32-encoding";
import { StorageProposal } from "./storage-proposal";
import cbor from "borc";

interface AddressConfig {
  type: string;
}

enum AddressProtocol {
  ID,
  // SECP256K1 represents the address SECP256K1 protocol.
  SECP256K1,
  // Actor represents the address Actor protocol.
  Actor,
  // BLS represents the address BLS protocol.
  BLS,
  Unknown = 255
}

enum AddressNetwork {
  Testnet = "t",
  Mainnet = "m"
}

class Address extends SerializableLiteral<AddressConfig> {
  get config() {
    return {
      defaultValue: literal => literal
    };
  }

  static readonly MAINNET_PREFIX = "f";
  static readonly TESTNET_PREFIX = "t";

  static readonly CHECKSUM_BYTES = 4;

  readonly privateKey: string;
  readonly protocol: AddressProtocol;
  readonly network: AddressNetwork;

  constructor(
    privateKey: string,
    protocol: AddressProtocol = AddressProtocol.BLS,
    network: AddressNetwork = AddressNetwork.Testnet
  ) {
    if (protocol != AddressProtocol.BLS) {
      throw new Error(
        "Protocol type not yet supported. Supported address protocols: BLS"
      );
    }

    let address = Address.fromPrivateKey(privateKey, protocol, network);

    // The serialized value is the address
    super(address);

    this.privateKey = privateKey;
    this.protocol = protocol;
    this.network = network;
  }

  async signProposal(proposal: StorageProposal): Promise<Buffer> {
    let serialized = proposal.serialize();
    let encoded = cbor.encode(serialized);

    let signature = await bls.sign(encoded, this.privateKey);
    return Buffer.from(signature);
  }

  static fromPrivateKey(
    privateKey: string,
    protocol: AddressProtocol,
    network: AddressNetwork
  ): string {
    if (protocol != AddressProtocol.BLS) {
      throw new Error(
        "Protocol type not yet supported. Supported address protocols: BLS"
      );
    }

    // Reverse the key from little endian to big endian
    let bigEndian = privateKey.match(/.{2}/g).reverse().join("");

    // Get the public key
    let publicKey = Buffer.from(bls.getPublicKey(bigEndian));

    // Create a checksum using the blake2b algorithm
    let checksumBuffer = Buffer.concat([Buffer.from([protocol]), publicKey]);
    let checksum = blake.blake2b(checksumBuffer, null, Address.CHECKSUM_BYTES);

    // Merge the public key and checksum
    let checksummedPubKey = Buffer.concat([publicKey, checksum]);

    // Use a custom alphabet to base32 encode the checksummed public key,
    // and prepend the network and protocol identifiers.
    let customBase32Alpahbet = "abcdefghijklmnopqrstuvwxyz234567";
    let address =
      network.toString() +
      protocol.toString() +
      base32.stringify(checksummedPubKey, customBase32Alpahbet);

    return address;
  }

  static random(
    rng: () => number = Math.random,
    protocol: AddressProtocol = AddressProtocol.BLS,
    network: AddressNetwork = AddressNetwork.Testnet
  ): Address {
    // Note that this private key isn't cryptographically secure!
    // It uses insecure randomization! Don't use it in production!
    let alphabet = "0123456789abcdef";
    let privateKey = "_"
      .repeat(64)
      .split("")
      .map(() => alphabet[Math.floor(rng() * alphabet.length)])
      .join("");

    return new Address(privateKey);
  }

  // Note: This does not (yet) check for cryptographic validity!
  static isValid(value: string): boolean {
    return value.length == 86 && value.indexOf("t3") == 0;
  }
}

type SerializedAddress = string;

export { Address, SerializedAddress, AddressProtocol };
