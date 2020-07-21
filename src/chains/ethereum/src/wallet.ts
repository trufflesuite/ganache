import { utils } from "@ganache/utils";
import { Data, Quantity } from "@ganache/utils/src/things/json-rpc";
import Address from "./things/address";
import EthereumOptions from "./options";
import { privateToAddress } from "ethereumjs-util";
import Account from "./things/account";
import secp256k1 from "secp256k1";
import { ProviderOptions } from "@ganache/options";
import { mnemonicToSeedSync } from "bip39";
import HDKey from "hdkey";
import { alea as rng } from "seedrandom";

import createKeccakHash from "keccak";

const WEI = 1000000000000000000n;
const RPCQUANTITY_ZERO = Quantity.from("0x0");

const uncompressedPublicKeyToAddress = (uncompressedPublicKey: Buffer) => {
  const compresedPublicKey = secp256k1.publicKeyConvert(uncompressedPublicKey, false).slice(1);
  const hasher = createKeccakHash("keccak256");
  (hasher as any)._state.absorb(compresedPublicKey);
  return Address.from(hasher.digest().slice(-20));
}


export default class Wallet {
  readonly addresses: string[];
  readonly initialAccounts: Account[];
  readonly knownAccounts = new Map<string, Data>();
  readonly passphrases = new Map<string, string>();
  readonly unlockedAccounts = new Set<string>();
  readonly lockTimers = new Map<string, NodeJS.Timeout | number>();

  #hdKey: HDKey;

  constructor(opts: EthereumOptions) {
    this.#hdKey = HDKey.fromMasterSeed(mnemonicToSeedSync(opts.mnemonic, null));

    const initialAccounts = this.initialAccounts = this.#initializeAccounts(opts);

    const knownAccounts = this.knownAccounts;
    const unlockedAccounts = this.unlockedAccounts;

    //#region Configure Known and Unlocked Accounts
    const l = initialAccounts.length;
    const accountsCache = (this.addresses = Array(l));
    for (let i = 0; i < l; i++) {
      const account = initialAccounts[i];
      const address = account.address;
      const strAddress = address.toString();
      accountsCache[i] = strAddress;
      knownAccounts.set(strAddress, account.privateKey);

      // if the `secure` option has been set do NOT add these accounts to the
      // unlockedAccounts
      if (opts.secure) continue;

      unlockedAccounts.add(strAddress);
    }
    //#endregion

    //#region Unlocked Accounts
    const givenUnlockedAccounts = opts.unlocked_accounts;
    if (givenUnlockedAccounts) {
      const ul = givenUnlockedAccounts.length;
      for (let i = 0; i < ul; i++) {
        let arg = givenUnlockedAccounts[i];
        let address: string;
        switch (typeof arg) {
          case "string":
            // `toLowerCase` so we handle uppercase `0X` formats
            const addressOrIndex = arg.toLowerCase();
            if (addressOrIndex.indexOf("0x") === 0) {
              address = addressOrIndex;
              break;
            } else {
              // try to convert the arg string to a number.
              // don't use parseInt because strings like `"123abc"` parse
              // to `123`, and there is probably an error on the user's side we'd
              // want to uncover.
              const index = (arg as any) - 0;
              // if we don't have a valid number, or the number isn't a valid JS
              // integer (no bigints or decimals, please), throw an error.
              if (!Number.isSafeInteger(index)) {
                throw new Error(`Invalid value in unlocked_accounts: ${arg}`);
              }
              arg = index;
              // not `break`ing here because I want this to fall through to the
              //  `"number"` case below.
              // Refactor it if you want.
              // break; // no break, please.
            }
          case "number":
            const account = initialAccounts[arg];
            if (account == null) {
              throw new Error(`Account at index ${arg} not found. Max index available is ${l - 1}.`);
            }
            address = account.address.toString().toLowerCase();
            break;
          default:
            throw new Error(`Invalid value specified in unlocked_accounts`);
        }
        unlockedAccounts.add(address);
      }
    }
    //#endregion
  }

  #seedCounter = 0n;

  #randomBytes = (length: number) => {
    // Since this is a mock RPC library, the rng doesn't need to be
    // cryptographically secure, and determinism is desired.
    const buf = Buffer.allocUnsafe(length);
    const seed = (this.#seedCounter += 1n);
    const rand = rng(seed.toString());
    for (let i = 0; i < length; i++) {
      buf[i] = (rand() * 255) | 0;
    }
    return buf;
  }

  #initializeAccounts = (opts: ProviderOptions): Account[] => {
    // convert a potentially fractional balance of Ether to WEI
    const balanceParts = opts.default_balance_ether.toString().split(".", 2);
    const significand = BigInt(balanceParts[0]);
    const fractionalStr = balanceParts[1] || "0";
    const fractional = BigInt(fractionalStr);
    const magnitude = 10n ** BigInt(fractionalStr.length);
    const defaultBalanceInWei = (WEI * significand) + (fractional * (WEI/magnitude));
    const etherInWei = Quantity.from(defaultBalanceInWei);
    let accounts: Account[];

    let givenAccounts = opts.accounts;
    let accountsLength: number;
    if (givenAccounts && (accountsLength = givenAccounts.length) !== 0) {
      const hdKey = this.#hdKey;
      const hdPath = opts.hdPath;
      accounts = Array(accountsLength);
      for (let i = 0; i < accountsLength; i++) {
        const account = givenAccounts[i];
        const secretKey = account.secretKey;
        let privateKey: Data;
        let address: Address;
        if (!secretKey) {
          const acct = hdKey.derive(hdPath + i);
          address = uncompressedPublicKeyToAddress(acct.publicKey);
          privateKey = Data.from(acct.privateKey);
          accounts[i] = Wallet.createAccount(Quantity.from(account.balance), privateKey, address);
        } else {
          privateKey = Data.from(secretKey);
          const a = accounts[i] = Wallet.createAccountFromPrivateKey(privateKey);
          a.balance = Quantity.from(account.balance);
        }
      }
    } else {
      const numerOfAccounts = opts.total_accounts;
      if (numerOfAccounts) {
        accounts = Array(numerOfAccounts);
        const hdPath = opts.hdPath;
        const hdKey = this.#hdKey;

        for (let index = 0; index < numerOfAccounts; index++) {
          const acct = hdKey.derive(hdPath + index);
          const address = uncompressedPublicKeyToAddress(acct.publicKey);
          const privateKey = Data.from(acct.privateKey);
          accounts[index] = Wallet.createAccount(etherInWei, privateKey, address);
        }
      } else {
        throw new Error("Cannot initialize chain: either options.accounts or options.total_accounts must be specified");
      }
    }
    return accounts;
  };

  public static createAccount(balance: Quantity, privateKey: Data, address: Address) {
    const account = new Account(address);
    account.privateKey = privateKey;
    account.balance = balance;
    return account;
  }

  public static createAccountFromPrivateKey(privateKey: Data) {
    const address = Address.from(privateToAddress(privateKey.toBuffer()));
    const account = new Account(address);
    account.privateKey = privateKey;
    return account;
  }

  public createRandomAccount(startingSeed: string) {
    // create some seeded deterministic psuedo-randomness based on the chain's
    // initial starting conditions (`startingSeed`)
    const seed = Buffer.concat([Buffer.from(startingSeed), this.#randomBytes(64)]);
    const acct = HDKey.fromMasterSeed(seed);
    const address = uncompressedPublicKeyToAddress(acct.publicKey);
    const privateKey = Data.from(acct.privateKey);
    return Wallet.createAccount(RPCQUANTITY_ZERO, privateKey, address);
  }

  public assertValidPassphrase(lowerAddress: string, passphrase: string) {
    const storedPassphrase = this.passphrases.get(lowerAddress);
    if (storedPassphrase === undefined) {
      throw new Error("Account not found");
    }

    if (passphrase !== storedPassphrase) {
      throw new Error("Invalid password");
    }

    return true;
  }

  public unlockAccount(lowerAddress: string, passphrase: string, duration: number) {
    this.assertValidPassphrase(lowerAddress, passphrase);

    const existingTimer = this.lockTimers.get(lowerAddress);
    if (existingTimer) {
      clearTimeout(existingTimer as number);
    }

    // a duration <= 0 will remain unlocked
    const durationMs = (duration * 1000) | 0;
    if (durationMs > 0) {
      const timeout = setTimeout(this.#lockAccount, durationMs, lowerAddress);
      utils.unref(timeout);
      this.lockTimers.set(lowerAddress, timeout);
    }
    this.unlockedAccounts.add(lowerAddress);
    return true;
  }

  #lockAccount = (lowerAddress: string) => {
    this.lockTimers.delete(lowerAddress);
    this.unlockedAccounts.delete(lowerAddress);
    return true;
  }

  public lockAccount(lowerAddress: string) {
    clearTimeout(this.lockTimers.get(lowerAddress) as number);
    return this.#lockAccount(lowerAddress);
  }
}
