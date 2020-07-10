import Emittery from "emittery";
import {types, utils} from "@ganache/utils";
import FilecoinApi from "./api";

// Meant to mimic this provider: 
// https://github.com/filecoin-shipyard/js-lotus-client-provider-browser
export default class FilecoinProvider extends Emittery.Typed<undefined, "message" | "connect" | "disconnect"> 
  // Do I actually need this? `types.Provider` doesn't actually define anything behavior
  implements types.Provider<FilecoinApi>
  {
    constructor () {
      super();
    }

    async connect () {
      throw new Error("I have no idea if I need this (connect).");
    }

    async send () {
      throw new Error("I probably need this one, but am not sure yet. (send)");
    }

    async sendHttp () {
      throw new Error("I have no idea if I need this. (sendHttp)");
    }

    async sendWs () {
      throw new Error("I have no idea if I need this. (sendWs)");
    }

    async sendSubscription () {
      throw new Error("I have no idea if I need this. (sendSubscription)");
    }

    async receive () {
      throw new Error("I have no idea if I need this. (receive)");
    }

    async import () {
      throw new Error("I have no idea if I need this. (import)");
    }

    async destroy () {
      throw new Error("I have no idea if I need this. (destroy)");
    }
}