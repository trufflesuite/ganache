import { Message } from "./things/message";
import { MessageSendSpec } from "./things/message-send-spec";

/**
 * A subset of gas prices after the Filecoin Calico version upgrade.
 * Reference implementation: https://git.io/JtEg6
 */
export const GasPricesCalico = {
  computeGasMulti: 1,
  storageGasMulti: 1300,
  onChainMessageComputeBase: 38863,
  onChainMessageStorageBase: 36,
  onChainMessageStoragePerByte: 1,
  onChainReturnValuePerByte: 1,
  sendBase: 29233,
  sendTransferFunds: 27500,
  sendTransferOnlyPremium: 159672,
  sendInvokeMethod: -5377
};

// Reference implementation: https://git.io/JtEgH
export function getGasForOnChainMessage(message: Message) {
  const computeGas = GasPricesCalico.onChainMessageComputeBase;

  const messageSize = JSON.stringify(message.serialize()).length;
  const storageForBytes =
    GasPricesCalico.onChainMessageStoragePerByte *
    messageSize *
    GasPricesCalico.storageGasMulti;
  const storageGas =
    GasPricesCalico.onChainMessageStorageBase + storageForBytes;

  return computeGas + storageGas;
}

export function getGasForOnMethodInvocation(message: Message) {
  let gasUsed = GasPricesCalico.sendBase;

  if (message.value !== 0n) {
    gasUsed += GasPricesCalico.sendTransferFunds;
    if (message.method === 0) {
      gasUsed += GasPricesCalico.sendTransferOnlyPremium;
    }
  }

  if (message.method !== 0) {
    gasUsed += GasPricesCalico.sendInvokeMethod;
  }

  return gasUsed;
}

// Reference implementation: https://git.io/JtE2v adds the onchainmessage gas and return gas.
// https://git.io/JtE2Z gets called from above and adds invocation gas, which is simply just
// calling https://git.io/JtE2l.
// We don't add any return gas because transfers (method = 0) always return null in the ret
// value from vm.send() (which means there's no additional costs); see reference implementation
// here: https://git.io/JtE29.
export function getGasForMessage(message: Message) {
  return (
    getGasForOnChainMessage(message) + getGasForOnMethodInvocation(message)
  );
}

// Reference implementation: https://git.io/JtWnk
export function fillGasInformation(message: Message, spec: MessageSendSpec) {
  if (message.gasLimit === 0) {
    // Reference implementation: https://git.io/JtWZB
    // We don't bother with adding the buffer since this is "exactimation"
    message.gasLimit = getGasForMessage(message);
  }

  if (message.gasPremium === 0n) {
    // Reference implementation: https://git.io/JtWnm
    // Since this seems to look at prior prices and try to determine
    // them from there, and it implies a network coming up with those
    // prices, I'm just going to use 1 * MinGasPremium (https://git.io/JtWnG)
    message.gasPremium = 100000n;
  }

  if (message.gasFeeCap === 0n) {
    // Reference implementation: https://git.io/JtWn4
    // The effective computation is `GasFeeCap = GasPremium + BaseFee`
    // where the BaseFee is computed as a growing number based on the
    // block's ParentBaseFee, which we currently never set to non-zero in Ganache,
    // so the algorithm is simplified to `GasFeeCap = GasPremium`.
    // While there was no initial reason to set ParentBaseFee to a non-zero
    // value, after reading the description here https://git.io/JtEaP,
    // I believe that this is a fair assumption for Ganache. Ganache isn't meant
    // (yet) to simulate a live network with network conditions and computations.
    message.gasFeeCap = message.gasPremium;
  }

  // Reference Implementation: https://git.io/JtWng
  if (spec.maxFee === 0n) {
    // since the default is to guess network on conditions if 0, we're just going to skip
    return;
  } else {
    const totalFee = BigInt(message.gasLimit) * message.gasFeeCap;
    if (totalFee <= spec.maxFee) {
      return;
    }
    message.gasFeeCap = spec.maxFee / BigInt(message.gasLimit);
    message.gasPremium =
      message.gasFeeCap < message.gasPremium
        ? message.gasFeeCap
        : message.gasPremium;
  }
}

/**
 * Ganache currently doesn't implement BaseFee as it is
 * computed based on network conditions and block congestion,
 * neither of which Ganache is meant to do (yet).
 *
 * @returns 0
 */
export function getBaseFee(): number {
  return 0;
}

/**
 * Helper function to get the miner fee for a message
 */
export function getMinerFee(message: Message): bigint {
  // Reference: https://spec.filecoin.io/systems/filecoin_vm/gas_fee/
  // They state to use the GasLimit instead of GasUsed "in order to make
  // message selection for miners more straightforward". 🤷
  return BigInt(message.gasLimit) * message.gasPremium;
}
