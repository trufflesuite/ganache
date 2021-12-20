import { Address, AddressProtocol } from "./things/address";
import { Balance } from "./things/balance";
import { Message } from "./things/message";
import { SigType } from "./things/sig-type";
import { SignedMessage } from "./things/signed-message";
import cbor from "borc";

const ZeroAddress =
  "t3yaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaby2smx7a";
const TotalFilecoin = Balance.FILToLowestDenomination(2000000000);
const BlockGasLimit = 10000000000;
const minimumBaseFee = 100;

// Reference implementation: https://git.io/JtErT
export function ValidForBlockInclusion(
  m: Message,
  minGas: number,
  version: number
): Error | null {
  if (m.version !== 0) {
    return new Error("'Version' unsupported");
  }

  if (m.to.trim() === "") {
    return new Error("'To' address cannot be empty");
  }

  if (m.to === ZeroAddress && version >= 7) {
    return new Error("invalid 'To' address");
  }

  if (m.from.trim() === "") {
    return new Error("'From' address cannot be empty");
  }

  // We would have already thrown when trying to deserialize null for Value
  // if (m.Value.Int == nil) {
  //   return xerrors.New("'Value' cannot be nil")
  // }

  if (m.value < 0n) {
    return new Error("'Value' field cannot be negative");
  }

  if (m.value > TotalFilecoin) {
    return new Error(
      "'Value' field cannot be greater than total filecoin supply"
    );
  }

  // We would have already thrown when trying to deserialize null for GasFeeCap
  // if m.GasFeeCap.Int == nil {
  //   return xerrors.New("'GasFeeCap' cannot be nil")
  // }

  if (m.gasFeeCap < 0n) {
    return new Error("'GasFeeCap' field cannot be negative");
  }

  // We would have already thrown when trying to deserialize null for GasPremium
  // if m.GasPremium.Int == nil {
  //   return xerrors.New("'GasPremium' cannot be nil")
  // }

  if (m.gasPremium < 0n) {
    return new Error("'GasPremium' field cannot be negative");
  }

  if (m.gasPremium > m.gasFeeCap) {
    return new Error("'GasFeeCap' less than 'GasPremium'");
  }

  if (m.gasLimit > BlockGasLimit) {
    return new Error(
      "'GasLimit' field cannot be greater than a block's gas limit"
    );
  }

  // since prices might vary with time, this is technically semantic validation
  if (m.gasLimit < minGas) {
    return new Error(
      `'GasLimit' field cannot be less than the cost of storing a message on chain ${m.gasLimit} < ${minGas}`
    );
  }

  return null;
}

function sigCacheKey(signedMessage: SignedMessage): Error | string {
  switch (signedMessage.signature.type) {
    case SigType.SigTypeBLS:
      if (signedMessage.signature.data.length < 90) {
        return new Error("bls signature too short");
      }

      return (
        signedMessage.message.cid.value +
        signedMessage.signature.data.subarray(64).toString()
      );
    case SigType.SigTypeSecp256k1:
      return signedMessage.message.cid.value;
    default:
      return new Error(
        `unrecognized signature type: ${signedMessage.signature.type}`
      );
  }
}

export async function verifyMessageSignature(
  signedMessage: SignedMessage
): Promise<Error | null> {
  const sck = sigCacheKey(signedMessage);
  if (sck instanceof Error) {
    return sck;
  }

  // we would have already errored trying to serialized null
  // if sig == nil {
  //   return xerrors.Errorf("signature is nil")
  // }

  if (
    Address.parseProtocol(signedMessage.message.from) === AddressProtocol.ID
  ) {
    return new Error(
      "must resolve ID addresses before using them to verify a signature"
    );
  }

  const address = new Address(signedMessage.message.from);

  switch (signedMessage.signature.type) {
    case SigType.SigTypeBLS: {
      const verified = await address.verifySignature(
        Buffer.from(signedMessage.message.cid.value),
        signedMessage.signature
      );

      return verified ? null : new Error("bls signature failed to verify");
    }
    case SigType.SigTypeSecp256k1: {
      const serialized = signedMessage.message.serialize();
      const encoded = cbor.encode(serialized);
      const verified = await address.verifySignature(
        encoded,
        signedMessage.signature
      );

      return verified ? null : new Error("signature did not match");
    }
    default:
      return new Error(
        `cannot verify signature of unsupported type: ${signedMessage.signature.type}`
      );
  }
}

// Reference implementation: https://git.io/JtErT
export async function checkMessage(
  signedMessage: SignedMessage
): Promise<Error | null> {
  const size = JSON.stringify(signedMessage.serialize()).length;
  if (size > 32 * 1024) {
    return new Error(`mpool message too large (${size}B): message too big`);
  }

  const validForBlockInclusion = ValidForBlockInclusion(
    signedMessage.message,
    0,
    8
  );
  if (validForBlockInclusion !== null) {
    return new Error(
      `message not valid for block inclusion: ${validForBlockInclusion.message}`
    );
  }

  if (signedMessage.message.gasFeeCap < minimumBaseFee) {
    return new Error("gas fee cap too low");
  }

  const verifySignature = await verifyMessageSignature(signedMessage);
  if (verifySignature !== null) {
    return verifySignature;
  }

  return null;
}
