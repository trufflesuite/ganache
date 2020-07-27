//#region Imports
import Emittery from "emittery";
import {types} from "@ganache/utils";
import Blockchain from "./blockchain";

const _blockchain = Symbol("blockchain");

export default class FilecoinApi implements types.Api {
  readonly [index: string]: (...args: any) => Promise<any>;

  private readonly [_blockchain]: Blockchain;

  constructor(emitter: Emittery.Typed<undefined, "ready">) {
    const blockchain = (this[_blockchain] = new Blockchain());
    blockchain.on("ready", () => {
      emitter.emit("ready"); 
    })
  }

  async stop() {
    await this[_blockchain].stop();
  }

  async "Filecoin.ChainGetGenesis"() {
    return this[_blockchain].latestTipset().serialize();;
  }

  async "Filecoin.ChainHead"() {
    return this[_blockchain].latestTipset().serialize();
  }

  async "Filecoin.StateListMiners"() {
    return [this[_blockchain].miner.serialize()];
  }

  async "Filecoin.WalletDefaultAddress"() {
    return this[_blockchain].address.serialize();
  }

  async "Filecoin.WalletBalance"(address:string) {
    let managedAddress = this[_blockchain].address;

    // For now, anything but our default address will have no balance
    if (managedAddress.value == address) {
      return this[_blockchain].balance.serialize();
    } else {
      return "0";
    }
  }

  async "Filecoin.GanacheMineTipset"() {
    this[_blockchain].mineTipset();
    return this[_blockchain].latestTipset().serialize();
  }
}