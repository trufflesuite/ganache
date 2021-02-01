import Manager from "./manager";
import { LevelUp } from "levelup";
import { SignedMessage, SignedMessageConfig } from "../things/signed-message";

export default class SignedMessageManager extends Manager<
  SignedMessage,
  SignedMessageConfig
> {
  static async initialize(base: LevelUp) {
    const manager = new SignedMessageManager(base);
    return manager;
  }

  constructor(base: LevelUp) {
    super(base, SignedMessage);
  }

  async putSignedMessage(message: SignedMessage) {
    await super.set(message.cid.value, message);
  }
}
