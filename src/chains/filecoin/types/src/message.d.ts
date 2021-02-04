import { Message } from "./things/message";
import { SignedMessage } from "./things/signed-message";
export declare function ValidForBlockInclusion(
  m: Message,
  minGas: number,
  version: number
): Error | null;
export declare function verifyMessageSignature(
  signedMessage: SignedMessage
): Promise<Error | null>;
export declare function checkMessage(
  signedMessage: SignedMessage
): Promise<Error | null>;
