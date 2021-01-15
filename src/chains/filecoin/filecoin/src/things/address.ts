import { SerializableLiteral } from "./serializable-literal";
import blake from "blakejs";
import * as bls from "noble-bls12-381";
import base32 from "base32-encoding";
import { StartDealParams } from "./start-deal-params";
import cbor from "borc";

// https://spec.filecoin.io/appendix/address/

interface AddressConfig {
  type: string;
}

enum AddressProtocol {
  ID,
  SECP256K1, // Represents the address SECP256K1 protocol
  Actor, // Represents the address Actor protocol
  BLS, // Represents the address BLS protocol
  Unknown = 255
}

enum AddressNetwork {
  Testnet = "t",
  Mainnet = "f"
}

class Address extends SerializableLiteral<AddressConfig> {
  get config() {
    return {
      defaultValue: literal => literal
    };
  }

  static readonly CHECKSUM_BYTES = 4;

  readonly privateKey: string;
  readonly protocol: AddressProtocol;
  readonly network: AddressNetwork;

  constructor(
    privateKey: string,
    protocol: AddressProtocol = AddressProtocol.BLS,
    network: AddressNetwork = AddressNetwork.Testnet
  ) {
    if (protocol !== AddressProtocol.BLS) {
      throw new Error(
        "Protocol type not yet supported. Supported address protocols: BLS"
      );
    }

    const address = Address.fromPrivateKey(privateKey, protocol, network);

    // The serialized value is the address
    super(address);

    this.privateKey = privateKey;
    this.protocol = protocol;
    this.network = network;
  }

  async signProposal(proposal: StartDealParams): Promise<Buffer> {
    const serialized = proposal.serialize();
    const encoded = cbor.encode(serialized);

    const signature = await bls.sign(encoded, this.privateKey);
    return Buffer.from(signature);
  }

  private static fromPrivateKey(
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
    const bigEndian = privateKey.match(/.{2}/g).reverse().join("");

    // Get the public key
    const publicKey = Buffer.from(bls.getPublicKey(bigEndian));

    // Create a checksum using the blake2b algorithm
    const checksumBuffer = Buffer.concat([Buffer.from([protocol]), publicKey]);
    const checksum = blake.blake2b(
      checksumBuffer,
      null,
      Address.CHECKSUM_BYTES
    );

    // Merge the public key and checksum
    const checksummedPubKey = Buffer.concat([publicKey, checksum]);

    // Use a custom alphabet to base32 encode the checksummed public key,
    // and prepend the network and protocol identifiers.
    const customBase32Alpahbet = "abcdefghijklmnopqrstuvwxyz234567";
    const address = `${network}${protocol}${base32.stringify(
      checksummedPubKey,
      customBase32Alpahbet
    )}`;

    return address;
  }

  static random(
    rng: () => number = Math.random,
    protocol: AddressProtocol = AddressProtocol.BLS,
    network: AddressNetwork = AddressNetwork.Testnet
  ): Address {
    // Note that this private key isn't cryptographically secure!
    // It uses insecure randomization! Don't use it in production!
    const alphabet = "0123456789abcdef";
    const privateKey = "_"
      .repeat(64)
      .split("")
      .map(() => alphabet[Math.floor(rng() * alphabet.length)])
      .join("");

    return new Address(privateKey, protocol, network);
  }

  // Note: This does not (yet) check for cryptographic validity!
  static isValid(value: string): boolean {
    return value.length == 86 && value.indexOf("t3") == 0;
  }
}

type SerializedAddress = string;

export { Address, SerializedAddress, AddressProtocol };
