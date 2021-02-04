import { Message } from "./things/message";
import { MessageSendSpec } from "./things/message-send-spec";
/**
 * A subset of gas prices after the Filecoin Calico version upgrade.
 * Reference implementation: https://git.io/JtEg6
 */
export declare const GasPricesCalico: {
  computeGasMulti: number;
  storageGasMulti: number;
  onChainMessageComputeBase: number;
  onChainMessageStorageBase: number;
  onChainMessageStoragePerByte: number;
  onChainReturnValuePerByte: number;
  sendBase: number;
  sendTransferFunds: number;
  sendTransferOnlyPremium: number;
  sendInvokeMethod: number;
};
export declare function getGasForOnChainMessage(message: Message): number;
export declare function getGasForOnMethodInvocation(message: Message): number;
export declare function getGasForMessage(message: Message): number;
export declare function fillGasInformation(
  message: Message,
  spec: MessageSendSpec
): void;
/**
 * Ganache currently doesn't implement BaseFee as it is
 * computed based on network conditions and block congestion,
 * neither of which Ganache is meant to do (yet).
 *
 * @returns 0
 */
export declare function getBaseFee(): number;
/**
 * Helper function to get the miner fee for a message
 */
export declare function getMinerFee(message: Message): bigint;
