import { Account } from "@ganache/ethereum-utils";
import {
  createAccountFromSeed,
  createAccountGeneratorFromSeedAndPath,
  HDKey
} from "./hdkey";
import {
  ACCOUNT_ZERO,
  Data,
  keccak,
  Quantity,
  unref,
  WEI
} from "@ganache/utils";
import { privateToAddress } from "@ethereumjs/util";
import secp256k1, { SECP256K1_N } from "@ganache/secp256k1";
import { mnemonicToSeedSync } from "bip39";
import { alea } from "seedrandom";
import crypto from "crypto";
import { writeFileSync } from "fs";
import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { Address } from "@ganache/ethereum-address";

const TWELVE_255s = Buffer.allocUnsafe(12).fill(255);

//#region Constants
const SCRYPT_PARAMS = {
  dklen: 32,
  n: 1024, // practically nothing
  p: 8,
  r: 1
} as const;
const CIPHER = "aes-128-ctr";
const MAX_ACCOUNTS = 100000;
//#endregion

type OmitLastType<T extends [unknown, ...Array<unknown>]> = T extends [
  ...infer A,
  infer _L
]
  ? A
  : never;
type LastType<T extends [unknown, ...Array<unknown>]> = T extends [
  ...infer _A,
  infer L
]
  ? L
  : never;

type Params = Parameters<typeof crypto.scrypt>;
type LastParams = Parameters<LastType<Params>>;
const scrypt = (...args: OmitLastType<Params>) => {
  return new Promise(
    (
      resolve: (value: LastParams[1]) => void,
      reject: (reason: LastParams[0]) => void
    ) => {
      crypto.scrypt.call(
        crypto,
        ...args,
        (err: LastParams[0], derivedKey: LastParams[1]) => {
          if (err) {
            return void reject(err);
          }
          return resolve(derivedKey);
        }
      );
    }
  );
};

const scryptSync = (...args: OmitLastType<Params>) => {
  return crypto.scryptSync.call(crypto, ...args);
};

/**
 * A Buffer that can be reused by `uncompressedPublicKeyToAddress`.
 */
const SHARED_BUFFER = Buffer.allocUnsafe(65);

const uncompressedPublicKeyToAddress = (uncompressedPublicKey: Buffer) => {
  const status = secp256k1.publicKeyConvert(
    SHARED_BUFFER,
    uncompressedPublicKey
  );
  switch (status) {
    case 0:
      return Address.from(keccak(SHARED_BUFFER.slice(1)).slice(-20));
    case 1:
      throw new Error("Public Key could not be parsed");
    case 2:
      throw new Error("Public Key serialization error");
  }
};

const asUUID = (uuid: Buffer | { length: 16 }) => {
  return `${uuid.toString("hex", 0, 4)}-${uuid.toString(
    "hex",
    4,
    6
  )}-${uuid.toString("hex", 6, 8)}-${uuid.toString(
    "hex",
    8,
    10
  )}-${uuid.toString("hex", 10)}`;
};

type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
type EncryptType = ThenArg<ReturnType<Wallet["encrypt"]>>;
type MaybeEncrypted =
  | { encrypted: true; key: EncryptType }
  | { encrypted: false; key: Buffer };

export default class Wallet {
  readonly addresses: string[];
  readonly initialAccounts: Account[];
  readonly knownAccounts = new Set<string>();
  readonly keyFiles = new Map<string, MaybeEncrypted>();
  readonly unlockedAccounts = new Map<string, Data>();
  readonly lockTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    opts: EthereumInternalOptions["wallet"],
    logging: EthereumInternalOptions["logging"]
  ) {
    if (opts.totalAccounts > MAX_ACCOUNTS) {
      logging.logger.log(
        `wallet.totalAccounts exceeds MAX_ACCOUNTS (${MAX_ACCOUNTS}) and may affect performance.`
      );
    }
    // create a RNG from our initial starting conditions (opts.mnemonic)
    this.#randomRng = alea("ganache " + opts.mnemonic);

    const initialAccounts = this.#initializeAccounts(opts);
    this.initialAccounts = Array.from(initialAccounts.values());
    this.addresses = Array.from(initialAccounts.keys());
    const l = this.initialAccounts.length;

    const unlockedAccounts = this.unlockedAccounts;

    //#region Unlocked Accounts
    const givenUnlockedAccounts = opts.unlockedAccounts;
    if (givenUnlockedAccounts) {
      const ul = givenUnlockedAccounts.length;
      for (let i = 0; i < ul; i++) {
        let arg = givenUnlockedAccounts[i];
        let address: string;
        let privateKey: Data;
        switch (typeof arg) {
          case "string":
            // `toLowerCase` so we handle uppercase `0X` formats
            const addressOrIndex = arg.toLowerCase();
            if (addressOrIndex.indexOf("0x") === 0) {
              address = addressOrIndex;
              const account = initialAccounts.get(address);
              if (account) {
                privateKey = account.privateKey;
              } else {
                // this wasn't one of our initial accounts, so make a priv key.
                privateKey = this.createFakePrivateKey(address);

                // add the account to the list of addresses because we want
                // `eth_accounts` to return this account.
                this.addresses.push(address);
              }
              break;
            } else {
              // try to convert the arg string to a number.
              // don't use parseInt because strings like `"123abc"` parse
              // to `123`, and there is probably an error on the user's side we'd
              // want to uncover.
              const index = (arg as any as number) - 0;
              // if we don't have a valid number, or the number isn't a valid JS
              // integer (no bigints or decimals, please), throw an error.
              if (!Number.isSafeInteger(index)) {
                throw new Error(
                  `Invalid value in wallet.unlockedAccounts: ${arg}`
                );
              }
              arg = index;
              // not `break`ing here because I want this to fall through to the
              //  `"number"` case below.
              // Refactor it if you want.
              // break; // no break, please.
            }
          case "number":
            const account = this.initialAccounts[arg];
            if (account == null) {
              throw new Error(
                `Account at index ${arg} not found. Max index available is ${
                  l - 1
                }.`
              );
            }
            address = account.address.toString().toLowerCase();
            privateKey = account.privateKey;
            break;
          default:
            throw new Error(`Invalid value specified in unlocked_accounts`);
        }
        if (unlockedAccounts.has(address)) continue;

        unlockedAccounts.set(address, privateKey);
      }
    }
    //#endregion

    //#region save accounts to disk
    if (opts.accountKeysPath != null) {
      const fileData = {
        addresses: {} as { [address: string]: string },
        private_keys: {} as { [address: string]: Data }
      };
      unlockedAccounts.forEach((privateKey, address) => {
        fileData.addresses[address] = address;
        fileData.private_keys[address] = privateKey;
      });

      // WARNING: Do not turn this to an async method without
      // making a Wallet.initialize() function and calling it via
      // Provider.initialize(). No async methods in constructors.
      // writeFileSync here is acceptable.
      writeFileSync(opts.accountKeysPath, JSON.stringify(fileData));
    }
    //#endregion
  }

  #randomRng: () => number;

  #randomBytes = (length: number) => {
    // Since this is a mock RPC library, the rng doesn't need to be
    // cryptographically secure, and determinism is desired.
    const buf = Buffer.allocUnsafe(length);
    const rand = this.#randomRng;
    for (let i = 0; i < length; i++) {
      buf[i] = (rand() * 256) | 0; // generates a random number from 0 to 255
    }
    return buf;
  };

  #initializeAccounts = (
    options: EthereumInternalOptions["wallet"]
  ): Map<string, Account> => {
    const makeAccountAtIndex = createAccountGeneratorFromSeedAndPath(
      mnemonicToSeedSync(options.mnemonic, null),
      options.hdPath
    );

    // convert a potentially fractional balance of Ether to WEI
    const balanceParts = options.defaultBalance.toString().split(".", 2);
    const significand = BigInt(balanceParts[0]);
    const fractionalStr = balanceParts[1] || "0";
    const fractional = BigInt(fractionalStr);
    const magnitude = 10n ** BigInt(fractionalStr.length);
    const defaultBalanceInWei =
      WEI * significand + fractional * (WEI / magnitude);
    const etherInWei = Quantity.from(defaultBalanceInWei);
    const accounts: Map<string, Account> = new Map<string, Account>();
    const givenAccounts = options.accounts;

    let accountsLength: number;
    if (givenAccounts && (accountsLength = givenAccounts.length) !== 0) {
      for (let i = 0; i < accountsLength; i++) {
        const givenAccount = givenAccounts[i];
        const secretKey = givenAccount.secretKey;
        let account: Account;
        if (secretKey) {
          const balance = Quantity.from(givenAccount.balance);
          account = this.#intializeAccountFromKey(balance, secretKey, options);
        } else {
          const acct = makeAccountAtIndex(i);
          account = this.#initializeAccountWithoutKey(
            etherInWei,
            acct,
            options
          );
        }
        accounts.set(account.address.toString(), account);
      }
    } else {
      const numberOfAccounts = options.totalAccounts;

      if (numberOfAccounts != null) {
        for (let i = 0; i < numberOfAccounts; i++) {
          const acct = makeAccountAtIndex(i);
          const account = this.#initializeAccountWithoutKey(
            etherInWei,
            acct,
            options
          );
          accounts.set(account.address.toString(), account);
        }
      }
    }
    return accounts;
  };

  #intializeAccountFromKey = (
    balance: Quantity,
    secretKey: string,
    options: EthereumInternalOptions["wallet"]
  ) => {
    const privateKey = Data.from(secretKey);
    const account = Wallet.createAccountFromPrivateKey(privateKey);
    account.balance = balance;
    const address = account.address;
    this.#initializeAccount(address, privateKey, options);
    return account;
  };

  #initializeAccountWithoutKey = (
    balance: Quantity,
    acct: HDKey,
    options: EthereumInternalOptions["wallet"]
  ) => {
    const address = uncompressedPublicKeyToAddress(acct.publicKey);
    const privateKey = Data.from(acct.privateKey);
    const account = Wallet.createAccount(balance, privateKey, address);
    this.#initializeAccount(address, privateKey, options);
    return account;
  };

  #initializeAccount = (
    address: Address,
    privateKey: Data,
    options: EthereumInternalOptions["wallet"]
  ) => {
    const { passphrase, lock: lockAccounts } = options;
    const knownAccounts = this.knownAccounts;

    this.addToKeyFileSync(address, privateKey, passphrase, lockAccounts);
    const strAddress = address.toString();
    knownAccounts.add(strAddress);

    // if the `lock` option has been not been set, we're safe to add this
    // account to unlockedAccounts
    if (!lockAccounts) {
      this.unlockedAccounts.set(strAddress, privateKey);
    }
  };

  public async encrypt(privateKey: Data, passphrase: string) {
    const random = this.#randomBytes(32 + 16 + 16);
    const salt = random.slice(0, 32); // first 32 bytes
    const iv = random.slice(32, 32 + 16); // next 16 bytes
    const uuid = random.slice(32 + 16); // last 16 bytes

    const derivedKey = await scrypt(passphrase, salt, SCRYPT_PARAMS.dklen, {
      ...SCRYPT_PARAMS,
      N: SCRYPT_PARAMS.n
    });
    return this.finishEncryption(derivedKey, privateKey, salt, iv, uuid);
  }

  /**
   * Syncronous version of the `encrypt` function.
   * @param privateKey -
   * @param passphrase -
   */
  public encryptSync(privateKey: Data, passphrase: string) {
    const random = this.#randomBytes(32 + 16 + 16);
    const salt = random.slice(0, 32); // first 32 bytes
    const iv = random.slice(32, 32 + 16); // next 16 bytes
    const uuid = random.slice(32 + 16); // last 16 bytes

    const derivedKey = scryptSync(passphrase, salt, SCRYPT_PARAMS.dklen, {
      ...SCRYPT_PARAMS,
      N: SCRYPT_PARAMS.n
    });
    return this.finishEncryption(derivedKey, privateKey, salt, iv, uuid);
  }

  public finishEncryption(
    derivedKey: Buffer,
    privateKey: Data,
    salt: Buffer,
    iv: Buffer,
    uuid: Buffer
  ) {
    const cipher = crypto.createCipheriv(CIPHER, derivedKey.slice(0, 16), iv);
    const ciphertext = Buffer.concat([
      cipher.update(privateKey.toBuffer()),
      cipher.final()
    ]);
    const mac = keccak(Buffer.concat([derivedKey.slice(16, 32), ciphertext]));
    return {
      crypto: {
        cipher: CIPHER,
        ciphertext: Data.from(ciphertext),
        cipherparams: {
          iv: Data.from(iv)
        },
        kdf: "scrypt",
        kdfParams: {
          ...SCRYPT_PARAMS,
          salt: Data.from(salt)
        },
        mac: Data.from(mac)
      },
      id: asUUID(uuid),
      version: 3
    };
  }

  public async decrypt(keyfile: EncryptType, passphrase: crypto.BinaryLike) {
    const crypt = keyfile.crypto;

    if (crypt.cipher !== CIPHER) {
      throw new Error(`keyfile cypher must be "${CIPHER}"`);
    }
    if (crypt.kdf !== "scrypt") {
      throw new Error(`keyfile kdf must be "script"`);
    }

    const kdfParams = crypt.kdfParams;
    const salt = kdfParams.salt;
    const mac = crypt.mac;
    const ciphertext = crypt.ciphertext.toBuffer();

    let derivedKey: Buffer;
    let localMac: Buffer;
    if (passphrase != null) {
      try {
        derivedKey = await scrypt(
          passphrase,
          salt.toBuffer(),
          kdfParams.dklen,
          { ...kdfParams, N: kdfParams.n }
        );
        localMac = keccak(
          Buffer.concat([derivedKey.slice(16, 32), ciphertext])
        );
      } catch {
        localMac = null;
      }
    }

    if (!localMac || !mac.toBuffer().equals(localMac)) {
      throw new Error("could not decrypt key with given passphrase");
    }

    const decipher = crypto.createDecipheriv(
      crypt.cipher,
      derivedKey.slice(0, 16),
      crypt.cipherparams.iv.toBuffer()
    );
    const plaintext = decipher.update(ciphertext);
    return plaintext;
  }

  /**
   * Stores a mapping of addresses to either encrypted (if a passphrase is used
   * or the user specified --lock option) or unencrypted private keys.
   * @param address - The address whose private key is being stored.
   * @param privateKey - The passphrase to store.
   * @param passphrase - The passphrase to use to encrypt the private key. If
   * passphrase is empty, the private key will not be encrypted.
   * @param lock - Flag to specify that accounts should be encrypted regardless
   * of if the passphrase is empty.
   */
  public async addToKeyFile(
    address: Address,
    privateKey: Data,
    passphrase: string,
    lock: boolean
  ) {
    // NOTE: we are avoiding encrypting the keys for an account if the
    // passphrase is blank purely for startup performance reasons.
    if (passphrase || lock) {
      this.keyFiles.set(address.toString(), {
        encrypted: true,
        key: await this.encrypt(privateKey, passphrase)
      });
    } else {
      this.keyFiles.set(address.toString(), {
        encrypted: false,
        key: privateKey.toBuffer()
      });
    }
  }

  /**
   * Synchronus version of `addToKeyFile`.
   * Stores a mapping of addresses to either encrypted (if a passphrase is used
   * or the user specified --lock option) or unencrypted private keys.
   * @param address - The address whose private key is being stored.
   * @param privateKey - The passphrase to store.
   * @param passphrase - The passphrase to use to encrypt the private key. If
   * passphrase is empty, the private key will not be encrypted.
   * @param lock - Flag to specify that accounts should be encrypted regardless
   * of if the passphrase is empty.
   */
  public addToKeyFileSync(
    address: Address,
    privateKey: Data,
    passphrase: string,
    lock: boolean
  ) {
    // NOTE: we are avoiding encrypting the keys for an account if the
    // passphrase is blank purely for startup performance reasons.
    if (passphrase || lock) {
      this.keyFiles.set(address.toString(), {
        encrypted: true,
        key: this.encryptSync(privateKey, passphrase)
      });
    } else {
      this.keyFiles.set(address.toString(), {
        encrypted: false,
        key: privateKey.toBuffer()
      });
    }
  }

  /**
   * Fetches the private key for a specific address. If the keyFile is encrypted
   * for the address, the passphrase is used to decrypt.
   * @param address - The address whose private key is to be fetched.
   * @param passphrase - The passphrase used to decrypt the private key.
   */
  public async getFromKeyFile(address: Address, passphrase: string) {
    const keyFile = this.keyFiles.get(address.toString());
    if (keyFile === undefined || keyFile === null) {
      throw new Error("no key for given address or file");
    }
    if (keyFile.encrypted === true) {
      return this.decrypt(keyFile.key, passphrase);
    } else {
      // if the keyFile is not marked as encrypted, they should provide no
      // passphrase. so we'll make it look like they gave the "wrong" passphrase
      // by throwing the same error that's thrown when decrypting
      if (passphrase) {
        throw new Error(
          'could not decrypt key with given passphrase (default passphrase for accounts created at startup is "")'
        );
      } else {
        return keyFile.key;
      }
    }
  }

  public static createAccount(
    balance: Quantity,
    privateKey: Data,
    address: Address
  ) {
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

  public createRandomAccount() {
    // create some seeded deterministic psuedo-randomness based on the chain's
    // initial starting conditions
    const seed = this.#randomBytes(128);
    const acct = createAccountFromSeed(seed);
    const address = uncompressedPublicKeyToAddress(acct.publicKey);
    const privateKey = Data.from(acct.privateKey);
    return Wallet.createAccount(Quantity.Zero, privateKey, address);
  }

  public async unlockAccount(
    address: Address,
    passphrase: string,
    duration: number
  ) {
    const lowerAddress = address.toString();
    const secretKey = await this.getFromKeyFile(address, passphrase);

    const existingTimer = this.lockTimers.get(lowerAddress);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // a duration <= 0 will remain unlocked
    const durationMs = (duration * 1000) | 0;
    if (durationMs > 0) {
      const timeout = setTimeout(this.#lockAccount, durationMs, lowerAddress);
      unref(timeout);
      this.lockTimers.set(lowerAddress, timeout as any);
    }

    this.unlockedAccounts.set(lowerAddress, Data.from(secretKey));
    return true;
  }

  public async addUnknownAccount(address: Address, passphrase: string) {
    const lowerAddress = address.toString();
    // if we "know" about this account, it cannot be added this way
    if (this.knownAccounts.has(lowerAddress)) {
      return false;
    }

    // this is an unknown account, so we do not have a private key. instead,
    // we'll need to create a fake one.
    const privateKey = this.createFakePrivateKey(lowerAddress);
    await this.addToKeyFile(address, privateKey, passphrase, true);
    this.knownAccounts.add(lowerAddress);
    this.addresses.push(lowerAddress);
    return true;
  }

  public async removeKnownAccount(address: Address, passphrase: string) {
    const lowerAddress = address.toString();
    // if we don't "know" about this account, it cannot be removed
    if (!this.knownAccounts.has(lowerAddress)) {
      return false;
    }

    const privateKey = await this.getFromKeyFile(address, passphrase);
    // we don't actually care what the private key is, we just need to know that
    // the passphrase they supplied is the right one. (empty string is a valid
    // privateKey for added, previously unknown accounts)
    if (privateKey != null) {
      this.keyFiles.delete(lowerAddress);
      this.knownAccounts.delete(lowerAddress);
      this.addresses.splice(this.addresses.indexOf(lowerAddress), 1);
      this.lockTimers.delete(lowerAddress);
      this.unlockedAccounts.delete(lowerAddress);
      return true;
    } else {
      throw new Error(
        "could not find private key for address/passphrase combination"
      );
    }
  }

  public createFakePrivateKey(address: string) {
    let fakePrivateKey: Buffer;
    const addressBuf = Address.from(address).toBuffer();
    if (addressBuf.equals(ACCOUNT_ZERO)) {
      // allow signing with the 0x0 address...
      // always sign with the same fake key, a 31 `0`s followed by a single
      // `1`. The key is arbitrary. It just must not be all `0`s and must be
      // deterministic.
      // see: https://github.com/ethereumjs/ethereumjs-monorepo/issues/829#issue-674385636
      fakePrivateKey = Buffer.allocUnsafe(32).fill(0, 0, 31);
      fakePrivateKey[31] = 1;
    } else {
      // Private keys must not be greater than *or equal to*:
      // 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141, and
      // if they are that large then signing of the transaction (ecdsaSign) will
      // fail.
      // Historically, we've just concatenated the address with part of itself,
      // to make something long enough to use as a private key, so we can't
      // change the default/legacy behavior now. But for addresses that would
      // generate an invalid private key we must use a different approach. If
      // the legacy way of generating a private key results in a key that is too
      // large
      //
      const first12 = addressBuf.slice(0, 12);
      fakePrivateKey = Buffer.concat([addressBuf, first12]);
      // BigInt is slow, so only do it if we might need to, which we usually
      // never will.
      // Since we already have a slice of the first 12 bytes let's use it to
      // help check if we might overflow the max secp256k1 key value. If the
      // first 12 bytes, the most significant digits of the key, are all `255`
      // then there is a chance that the fakePrivateKey will be too large.
      // `Buffer.compare` is a native method in V8, so it should be pretty fast.
      // example: the address `0xffffffffffff{anything can go here}` generates a
      // bad fakePrivateKey but, `0xfffffffffffe{anything can go here}` never
      // will. There are obviously many chances for a false positive, but the
      // next condition in the `while` loop will catch those.
      if (first12.compare(TWELVE_255s) === 0) {
        while (BigInt(`0x${fakePrivateKey.toString("hex")}`) >= SECP256K1_N) {
          // keccak returns a 32 byte hash of the input data, which is the exact
          // length we need for a private key.
          // note: if keccak can return its own input as its output, then this
          // loops forever. The chances of this happening are impossibly low, so
          // it's not worth the effort to check, but it would be interesting if
          // someone reported an issue that can cause this for a specific
          // address!
          fakePrivateKey = keccak(fakePrivateKey);
        }
      }
    }
    return Data.from(fakePrivateKey);
  }

  #lockAccount = (lowerAddress: string) => {
    this.lockTimers.delete(lowerAddress);
    this.unlockedAccounts.delete(lowerAddress);
    return true;
  };

  public lockAccount(lowerAddress: string) {
    if (!this.unlockedAccounts.has(lowerAddress)) return false;

    clearTimeout(this.lockTimers.get(lowerAddress));
    return this.#lockAccount(lowerAddress);
  }
}
