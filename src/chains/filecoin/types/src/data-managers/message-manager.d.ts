import Manager from "./manager";
import { LevelUp } from "levelup";
import { SignedMessage, SignedMessageConfig } from "../things/signed-message";
export default class SignedMessageManager extends Manager<
  SignedMessage,
  SignedMessageConfig
> {
  static initialize(base: LevelUp): Promise<SignedMessageManager>;
  constructor(base: LevelUp);
  putSignedMessage(message: SignedMessage): Promise<void>;
}
