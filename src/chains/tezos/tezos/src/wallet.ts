import { alea as rng } from "seedrandom";
import { TezosInternalOptions } from "@ganache/tezos-options";
import sodium from "libsodium-wrappers";
import bs58check from "bs58check";
import { join } from "path";

import fs from "fs";
import Emittery from "emittery";
import { Account } from "@ganache/tezos-utils";

const names = fs
  .readFileSync(join(__dirname, "assets/names.txt"), "utf8")
  .toLowerCase()
  .split(/\n/g);

export default class Wallet extends Emittery.Typed<
  undefined,
  "ready" | "close"
> {
  prefixes = {
    edsig: new Uint8Array([9, 245, 205, 134, 18]),
    edsk: new Uint8Array([13, 15, 58, 7]),
    edpk: new Uint8Array([13, 15, 37, 217]),
    tz1: new Uint8Array([6, 161, 159])
  };

  b58cencode(payload, prefix) {
    const n = new Uint8Array(prefix.length + payload.length);
    n.set(prefix);
    n.set(payload, prefix.length);
    return bs58check.encode(Buffer.from(n));
  }

  readonly initialAccounts: Account[];

  constructor(opts: TezosInternalOptions["wallet"]) {
    super();
    const initialAccounts = (this.initialAccounts = this.#initializeAccounts(
      opts
    ));
  }

  #initializeAccounts = (
    options: TezosInternalOptions["wallet"]
  ): Account[] => {
    const accounts: any[] = [];
    let name = names[0];
    const rand = rng(name);
    const usedNames = new Set();
    const getName = () => {
      let name;
      const l = names.length;
      do {
        name = names[Math.floor(rand() * l) + 0];
        if (usedNames.size > l / 2) {
          name += "_" + getName();
          break;
        }
      } while (usedNames.has(name));
      return name;
    };
    sodium.ready.then(() => {
      for (let i = 0; i < options.totalAccounts; i++) {
        usedNames.add(name);
        const seed = Buffer.from(name.repeat(42)).slice(0, 32);
        const account = this.createAccount(seed, name, options.defaultBalance);
        accounts.push(account);
        name = getName();
      }
      this.emit("ready");
    });
    return accounts;
  };

  public createAccount(seed: Buffer, name: string, balance: number): Account {
    try {
      const kp = sodium.crypto_sign_seed_keypair(seed);
      return {
        name: name.replace(/[^A-Za-z0-9_]+/g, "_"),
        pk: this.b58cencode(kp.publicKey, this.prefixes.edpk),
        pkh: this.b58cencode(
          sodium.crypto_generichash(20, kp.publicKey),
          this.prefixes.tz1
        ),
        sk:
          "unencrypted:" +
          this.b58cencode(kp.privateKey.slice(0, 32), this.prefixes.edsk),
        fullRawSk: kp.privateKey,
        balance
      };
    } catch (e) {
      console.log(e);
    }
  }
}
