import { SerializableLiteral } from "./serializable-literal";
import blake from "blakejs";
import * as bls from "noble-bls12-381";
import secp256K1 from "secp256k1";
import base32 from "base32-encoding";
import { StartDealParams } from "./start-deal-params";
import cbor from "borc";
import { RandomNumberGenerator } from "@ganache/utils";
import { Message } from "./message";
import { Signature } from "./signature";

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

  static readonly FirstNonSingletonActorId = 100; // Ref impl: https://git.io/JtgqT
  static readonly FirstMinerId = 1000; // Ref impl: https://git.io/Jt2WE
  static readonly CHECKSUM_BYTES = 4;
  static readonly CustomBase32Alphabet = "abcdefghijklmnopqrstuvwxyz234567";

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
      // TODO (Issue ganache#867): From the code at https://git.io/Jtud2,
      // it appears that messages are signed using the CID. However there are
      // two issues here that I spent too much time trying to figure out:
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

  async verifySignature(
    buffer: Buffer,
    signature: Signature
  ): Promise<boolean> {
    switch (this.protocol) {
      case AddressProtocol.BLS: {
        return await bls.verify(
          signature.data,
          buffer,
          Address.recoverBLSPublicKey(this.value)
        );
      }
      case AddressProtocol.SECP256K1: {
        const hash = blake.blake2b(buffer, null, 32);
        return secp256K1.ecdsaVerify(
          signature.data.slice(0, 64), // remove the recid suffix (should be the last/65th byte)
          hash,
          Address.recoverSECP256K1PublicKey(signature, hash)
        );
      }
      default: {
        return false;
      }
    }
  }

  static recoverBLSPublicKey(address: string): Buffer {
    const protocol = Address.parseProtocol(address);
    const decoded = base32.parse(
      address.slice(2),
      Address.CustomBase32Alphabet
    );
    const payload = decoded.slice(0, decoded.length - 4);

    if (protocol === AddressProtocol.BLS) {
      return payload;
    } else {
      throw new Error(
        "Address is not a BLS protocol; cannot recover the public key."
      );
    }
  }

  static recoverSECP256K1PublicKey(
    signature: Signature,
    message: Uint8Array
  ): Buffer {
    return Buffer.from(
      secp256K1.ecdsaRecover(
        signature.data.slice(0, 64),
        signature.data[64],
        message
      ).buffer
    );
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

    const checksum = Address.createChecksum(protocol, payload);

    // Merge the public key and checksum
    const payloadAndChecksum = Buffer.concat([payload, checksum]);

    // Use a custom alphabet to base32 encode the checksummed public key,
    // and prepend the network and protocol identifiers.
    const address = `${network}${protocol}${base32.stringify(
      payloadAndChecksum,
      Address.CustomBase32Alphabet
    )}`;

    return new Address(address, privateKey);
  }

  static random(
    rng: RandomNumberGenerator = new RandomNumberGenerator(),
    protocol: AddressProtocol = AddressProtocol.BLS,
    network: AddressNetwork = AddressNetwork.Testnet
  ): Address {
    // Note that this private key isn't cryptographically secure!
    // It uses insecure randomization! Don't use it in production!
    const privateKey = rng.getBuffer(32).toString("hex");

    return Address.fromPrivateKey(privateKey, protocol, network);
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

  /**
   * Creates an AddressProtocol.ID address
   * @param id - A positive integer for the id.
   * @param isSingletonSystemActor - If false, it adds Address.FirstNonSingletonActorId to the id.
   * Almost always `false`. See https://git.io/JtgqL for examples of singleton system actors.
   * @param network - The AddressNetwork prefix for the address; usually AddressNetwork.Testnet for Ganache.
   */
  static fromId(
    id: number,
    isSingletonSystemActor: boolean = false,
    isMiner: boolean = false,
    network: AddressNetwork = AddressNetwork.Testnet
  ): Address {
    if (Math.round(id) !== id || id < 0) {
      throw new Error("id must be a positive integer");
    }

    return new Address(
      `${network}${AddressProtocol.ID}${
        isSingletonSystemActor
          ? id
          : isMiner
          ? Address.FirstMinerId + id
          : Address.FirstNonSingletonActorId + id
      }`
    );
  }

  static createChecksum(protocol: AddressProtocol, payload: Buffer): Buffer {
    // Create a checksum using the blake2b algorithm
    const checksumBuffer = Buffer.concat([Buffer.from([protocol]), payload]);
    const checksum = blake.blake2b(
      checksumBuffer,
      null,
      Address.CHECKSUM_BYTES
    );
    return Buffer.from(checksum.buffer);
  }

  static validate(inputAddress: string): Address {
    inputAddress = inputAddress.trim();

    if (inputAddress === "" || inputAddress === "<empty>") {
      throw new Error("invalid address length");
    }

    // MaxAddressStringLength is the max length of an address encoded as a string
    // it includes the network prefix, protocol, and bls publickey (bls is the longest)
    const MaxAddressStringLength = 2 + 84;
    if (
      inputAddress.length > MaxAddressStringLength ||
      inputAddress.length < 3
    ) {
      throw new Error("invalid address length");
    }

    const address = new Address(inputAddress);
    const raw = address.value.slice(2);

    if (address.network === AddressNetwork.Unknown) {
      throw new Error("unknown address network");
    }

    if (address.protocol === AddressProtocol.Unknown) {
      throw new Error("unknown address protocol");
    }

    if (address.protocol === AddressProtocol.ID) {
      if (raw.length > 20) {
        throw new Error("invalid address length");
      }
      const id = parseInt(raw, 10);
      if (isNaN(id) || id.toString(10) !== raw) {
        throw new Error("invalid address payload");
      }
      return address;
    }

    const payloadWithChecksum = base32.parse(raw, Address.CustomBase32Alphabet);

    if (payloadWithChecksum.length < Address.CHECKSUM_BYTES) {
      throw new Error("invalid address checksum");
    }

    const payload = payloadWithChecksum.slice(
      0,
      payloadWithChecksum.length - Address.CHECKSUM_BYTES
    );
    const providedChecksum = payloadWithChecksum.slice(
      payloadWithChecksum.length - Address.CHECKSUM_BYTES
    );

    if (
      address.protocol === AddressProtocol.SECP256K1 ||
      address.protocol === AddressProtocol.Actor
    ) {
      if (payload.length !== 20) {
        throw new Error("invalid address payload");
      }
    }

    const generatedChecksum = Address.createChecksum(address.protocol, payload);
    if (!generatedChecksum.equals(providedChecksum)) {
      throw new Error("invalid address checksum");
    }

    return address;
  }
}

type SerializedAddress = string;

export { Address, SerializedAddress, AddressProtocol, AddressNetwork };
