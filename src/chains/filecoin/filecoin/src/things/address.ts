import { SerializableLiteral } from "./serializable-literal";
import blake from "blakejs";
import * as bls from "noble-bls12-381";
import base32 from "base32-encoding";
import { StartDealParams } from "./start-deal-params";
import cbor from "borc";
import { utils } from "@ganache/utils";
import { Message } from "./message";

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
  Mainnet = "f",
  Unknown = "UNKNOWN"
}

class Address extends SerializableLiteral<AddressConfig> {
  get config() {
    return {};
  }

  static readonly CHECKSUM_BYTES = 4;

  #privateKey?: string;
  get privateKey(): string | undefined {
    return this.#privateKey;
  }
  get network(): AddressNetwork {
    return Address.parseNetwork(this.value);
  }
  get protocol(): AddressProtocol {
    return Address.parseProtocol(this.value);
  }

  constructor(publicAddress: string, privateKey?: string) {
    super(publicAddress);
    this.#privateKey = privateKey;
  }

  setPrivateKey(privateKey: string) {
    this.#privateKey = privateKey;
  }

  async signProposal(proposal: StartDealParams): Promise<Buffer> {
    if (this.#privateKey) {
      const serialized = proposal.serialize();
      const encoded = cbor.encode(serialized);

      const signature = await bls.sign(encoded, this.#privateKey);
      return Buffer.from(signature);
    } else {
      throw new Error(
        `Could not sign proposal with address ${this.value} due to not having the associated private key.`
      );
    }
  }

  async signMessage(message: Message): Promise<Buffer> {
    if (this.#privateKey) {
      const serialized = message.serialize();
      const encoded = cbor.encode(serialized);

      const signature = await bls.sign(encoded, this.#privateKey);
      return Buffer.from(signature);
    } else {
      throw new Error(
        `Could not sign message with address ${this.value} due to not having the associated private key.`
      );
    }
  }

  static fromPrivateKey(
    privateKey: string,
    protocol: AddressProtocol = AddressProtocol.BLS,
    network: AddressNetwork = AddressNetwork.Testnet
  ): Address {
    if (protocol != AddressProtocol.BLS) {
      throw new Error(
        "Protocol type not yet supported. Supported address protocols: BLS"
      );
    }

    // Reverse the key from little endian to big endian
    const regex = privateKey.match(/.{2}/g);
    if (!regex) {
      throw new Error(
        `Could not create address from private key ${privateKey}`
      );
    }
    const bigEndian = regex.reverse().join("");

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

    return new Address(address, privateKey);
  }

  static random(
    rng: utils.RandomNumberGenerator = new utils.RandomNumberGenerator(),
    protocol: AddressProtocol = AddressProtocol.BLS,
    network: AddressNetwork = AddressNetwork.Testnet
  ): Address {
    // Note that this private key isn't cryptographically secure!
    // It uses insecure randomization! Don't use it in production!
    const privateKey = rng.getBuffer(32).toString("hex");

    return Address.fromPrivateKey(privateKey, protocol, network);
  }

  // Note: This does not (yet) check for cryptographic validity!
  static isValid(value: string): boolean {
    return value.length == 86 && value.indexOf("t3") == 0;
  }

  static parseNetwork(publicAddress: string): AddressNetwork {
    if (publicAddress.length < 1) {
      return AddressNetwork.Unknown;
    }

    switch (publicAddress.charAt(0)) {
      case AddressNetwork.Mainnet: {
        return AddressNetwork.Mainnet;
      }
      case AddressNetwork.Testnet: {
        return AddressNetwork.Testnet;
      }
      default: {
        return AddressNetwork.Unknown;
      }
    }
  }

  static parseProtocol(publicAddress: string): AddressProtocol {
    if (publicAddress.length < 2) {
      return AddressProtocol.Unknown;
    }

    switch (parseInt(publicAddress.charAt(1), 10)) {
      case AddressProtocol.ID: {
        return AddressProtocol.ID;
      }
      case AddressProtocol.BLS: {
        return AddressProtocol.BLS;
      }
      case AddressProtocol.Actor: {
        return AddressProtocol.Actor;
      }
      case AddressProtocol.SECP256K1: {
        return AddressProtocol.SECP256K1;
      }
      default: {
        return AddressProtocol.Unknown;
      }
    }
  }
}

type SerializedAddress = string;

export { Address, SerializedAddress, AddressProtocol };
