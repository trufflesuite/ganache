//#region Imports
import Emittery from "emittery";
import {types} from "@ganache/utils";
import { Tipset } from "./things/tipset";
import Blockchain from "./blockchain";

const _blockchain = Symbol("blockchain");

export default class FilecoinApi implements types.Api {
  readonly [index: string]: (...args: any) => Promise<any>;

  private readonly [_blockchain]: Blockchain;

  constructor() {
    const blockchain = (this[_blockchain] = new Blockchain());
  }

  async "Filecoin.ChainGetGenesis"() {
    return this[_blockchain].latestTipset().serialize();;
  }

  async "Filecoin.ChainHead"() {
    return this[_blockchain].latestTipset().serialize();
  }

  async "Filecoin.GanacheMineTipset"() {
    this[_blockchain].mineTipset();
    return this[_blockchain].latestTipset().serialize();
  }
}