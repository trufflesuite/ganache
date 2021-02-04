import { SerializableLiteral } from "./serializable-literal";
import blake from "blakejs";
import * as bls from "noble-bls12-381";
import secp256K1 from "secp256k1";
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

function switchEndianness(hexString: string) {
  const regex = hexString.match(/.{2}/g);
  if (!regex) {
    throw new Error(`Could not switch endianness of hex string: ${hexString}`);
  }
  return regex.reverse().join("");
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
      // From the code at https://git.io/Jtud2, it appears that messages
      // are signed using the CID. However there are two issues here that
      // I spent too much time trying to figure out:
      //   1. We don't generate an identical CID
      //   2. Even if we did, this signature doesn't match what lotus provides
      // But here's the catch, I know for certain `signBuffer` mimics lotus's
      // Filecoin.WalletSign method. In other words, if I take the CID that lotus gives me
      // and put it back into Filecoin.WalletSign, it matches the below output
      // (given that message.cid.value was replaced by the CID string provided
      // by lotus for the same message). I'm not sure what's wrong here without
      // debugging lotus itself and watching the values change, but since we're
      // not guaranteeing cryptographic integrity, I'm letting this one slide for now.
      return await this.signBuffer(Buffer.from(message.cid.value));
    } else {
      throw new Error(
        `Could not sign message with address ${this.value} due to not having the associated private key.`
      );
    }
  }

  async signBuffer(buffer: Buffer): Promise<Buffer> {
    if (this.#privateKey) {
      switch (this.protocol) {
        case AddressProtocol.BLS: {
          const signature = await bls.sign(
            buffer,
            switchEndianness(this.#privateKey)
          );
          return Buffer.from(signature);
        }
        case AddressProtocol.SECP256K1: {
          const hash = blake.blake2b(buffer, null, 32);
          const result = secp256K1.ecdsaSign(
            hash,
            Buffer.from(this.#privateKey, "hex")
          );
          return Buffer.concat([result.signature, Buffer.from([result.recid])]);
        }
        default: {
          throw new Error(
            `Cannot sign with this protocol ${this.protocol}. Supported protocols: BLS and SECP256K1`
          );
        }
      }
    } else {
      throw new Error(
        `Could not sign message with address ${this.value} due to not having the associated private key.`
      );
    }
  }

  static recoverPublicKey(address: string): Buffer {
    const protocol = Address.parseProtocol(address);
    const customBase32Alphabet = "abcdefghijklmnopqrstuvwxyz234567";
    const decoded = base32.parse(address.slice(2), customBase32Alphabet);
    const payload = decoded.slice(0, decoded.length - 4);
    const checksum = decoded.slice(decoded.length - 4);

    if (protocol === AddressProtocol.BLS) {
      return payload;
    } else if (protocol === AddressProtocol.SECP256K1) {
      return payload; // TODO
    } else {
      throw new Error(
        "Protocol type not yet supported. Supported address protocols: BLS, SECP256K1"
      );
    }
  }

  static fromPrivateKey(
    privateKey: string,
    protocol: AddressProtocol = AddressProtocol.BLS,
    network: AddressNetwork = AddressNetwork.Testnet
  ): Address {
    let publicKey: Buffer;
    let payload: Buffer;
    if (protocol === AddressProtocol.BLS) {
      // Get the public key
      // BLS uses big endian, but we use little endian
      publicKey = Buffer.from(bls.getPublicKey(switchEndianness(privateKey)));
      payload = publicKey;
    } else if (protocol === AddressProtocol.SECP256K1) {
      publicKey = Buffer.from(
        secp256K1.publicKeyCreate(Buffer.from(privateKey, "hex"), false)
      );
      // https://bit.ly/3atGMwX says blake2b-160, but calls the checksum
      // both blake2b-4 and 4 bytes, so there is inconsistency of the
      // terminology of bytes vs bits, but the implementation at
      // https://git.io/JtEM6 shows 20 bytes and 4 bytes respectively
      payload = Buffer.from(blake.blake2b(publicKey, null, 20));
    } else {
      throw new Error(
        "Protocol type not yet supported. Supported address protocols: BLS, SECP256K1"
      );
    }

    // Create a checksum using the blake2b algorithm
    const checksumBuffer = Buffer.concat([Buffer.from([protocol]), payload]);
    const checksum = blake.blake2b(
      checksumBuffer,
      null,
      Address.CHECKSUM_BYTES
    );

    // Merge the public key and checksum
    const payloadAndChecksum = Buffer.concat([payload, checksum]);

    // Use a custom alphabet to base32 encode the checksummed public key,
    // and prepend the network and protocol identifiers.
    const customBase32Alphabet = "abcdefghijklmnopqrstuvwxyz234567";
    const address = `${network}${protocol}${base32.stringify(
      payloadAndChecksum,
      customBase32Alphabet
    )}`;

    return new Address(address, privateKey);
  }
  // bafy2bzacebf6iacrgturdmhdhnlb3sy2aerstv3zahn7pckbzbbghksiq3bfg
  // bafy2bzacebuunkmqu6toz54dgicjjbckh7qcchc3xfeqwcuoz4gj4qkmji4wy
  // bafyreieclpob2quklfdbardaojv4ylxjasrihgt5kqoki267xarbldqgmi
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
