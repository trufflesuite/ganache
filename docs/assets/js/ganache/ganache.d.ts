/// <reference types="node" />

import type { AbstractIteratorOptions as AbstractIteratorOptions_2 } from 'abstract-level';
import type { AbstractLevel } from 'abstract-level';
import crypto from 'crypto';
import Emittery from 'emittery';
import { EventEmitter } from 'events';
import * as LRUCache from 'lru-cache';
import { Readable } from 'readable-stream';
import seedrandom from 'seedrandom';
import { URL } from 'url';

/**
 * @experimental
 */
export declare const __experimental_info: () => _ExperimentalInfo;

declare class AbortError extends Error {
    constructor();
}

declare type AbstractBatch<K = any, V = any> = PutBatch<K, V> | DelBatch<K, V>;

declare interface AbstractChainedBatch<K = any, V = any> extends AbstractOptions {
    put: (key: K, value: V) => this;
    del: (key: K) => this;
    clear: () => this;
    write(cb: ErrorCallback): any;
    write(options: any, cb: ErrorCallback): any;
}

declare const AbstractChainedBatch: AbstractChainedBatchConstructor;

declare interface AbstractChainedBatchConstructor {
    // tslint:disable-next-line no-unnecessary-generics
    new <K = any, V = any>(db: any): AbstractChainedBatch<K, V>;
    // tslint:disable-next-line no-unnecessary-generics
    <K = any, V = any>(db: any): AbstractChainedBatch<K, V>;
}

declare interface AbstractClearOptions<K = any> extends AbstractOptions {
    gt?: K | undefined;
    gte?: K | undefined;
    lt?: K | undefined;
    lte?: K | undefined;
    reverse?: boolean | undefined;
    limit?: number | undefined;
}

declare interface AbstractGetOptions extends AbstractOptions {
    asBuffer?: boolean | undefined;
}

declare interface AbstractIterator<K, V> extends AbstractOptions {
    db: AbstractLevelDOWN<K, V>;
    next(cb: ErrorKeyValueCallback<K, V>): this;
    end(cb: ErrorCallback): void;
}

declare const AbstractIterator: AbstractIteratorConstructor;

declare interface AbstractIteratorConstructor {
    // tslint:disable-next-line no-unnecessary-generics
    new <K = any, V = any>(db: any): AbstractIterator<K, V>;
    // tslint:disable-next-line no-unnecessary-generics
    <K = any, V = any>(db: any): AbstractIterator<K, V>;
}

declare interface AbstractIteratorOptions<K = any> extends AbstractOptions {
    gt?: K | undefined;
    gte?: K | undefined;
    lt?: K | undefined;
    lte?: K | undefined;
    reverse?: boolean | undefined;
    limit?: number | undefined;
    keys?: boolean | undefined;
    values?: boolean | undefined;
    keyAsBuffer?: boolean | undefined;
    valueAsBuffer?: boolean | undefined;
}

declare interface AbstractLevelDOWN<K = any, V = any> extends AbstractOptions {
    open(cb: ErrorCallback): void;
    open(options: AbstractOpenOptions, cb: ErrorCallback): void;

    close(cb: ErrorCallback): void;

    get(key: K, cb: ErrorValueCallback<V>): void;
    get(key: K, options: AbstractGetOptions, cb: ErrorValueCallback<V>): void;

    put(key: K, value: V, cb: ErrorCallback): void;
    put(key: K, value: V, options: AbstractOptions, cb: ErrorCallback): void;

    del(key: K, cb: ErrorCallback): void;
    del(key: K, options: AbstractOptions, cb: ErrorCallback): void;

    getMany(key: K[], cb: ErrorValueCallback<V[]>): void;
    getMany(key: K[], options: AbstractGetOptions, cb: ErrorValueCallback<V[]>): void;

    batch(): AbstractChainedBatch<K, V>;
    batch(array: ReadonlyArray<AbstractBatch<K, V>>, cb: ErrorCallback): AbstractChainedBatch<K, V>;
    batch(
    array: ReadonlyArray<AbstractBatch<K, V>>,
    options: AbstractOptions,
    cb: ErrorCallback,
    ): AbstractChainedBatch<K, V>;

    iterator(options?: AbstractIteratorOptions<K>): AbstractIterator<K, V>;

    readonly status: "new" | "opening" | "open" | "closing" | "closed";
    isOperational(): boolean;
}

declare const AbstractLevelDOWN: AbstractLevelDOWNConstructor;

declare interface AbstractLevelDOWNConstructor {
    // tslint:disable-next-line no-unnecessary-generics
    new <K = any, V = any>(location: string): AbstractLevelDOWN<K, V>;
    // tslint:disable-next-line no-unnecessary-generics
    <K = any, V = any>(location: string): AbstractLevelDOWN<K, V>;
}

declare interface AbstractOpenOptions extends AbstractOptions {
    createIfMissing?: boolean | undefined;
    errorIfExists?: boolean | undefined;
}

declare interface AbstractOptions {
    readonly [k: string]: any;
}

declare type AccessList = AccessListItem[];

declare type AccessList_2 = AccessListItem_2[];

declare type AccessListBuffer = AccessListBufferItem[];

declare type AccessListBufferItem = [Buffer, Buffer[]];

/**
 * Typed transaction with optional access lists
 *
 * - TransactionType: 1
 * - EIP: [EIP-2930](https://eips.ethereum.org/EIPS/eip-2930)
 */
declare class AccessListEIP2930Transaction extends BaseTransaction_2<AccessListEIP2930Transaction> {
    readonly chainId: bigint;
    readonly accessList: AccessListBuffer;
    readonly AccessListJSON: AccessList;
    readonly gasPrice: bigint;
    readonly common: Common;
    /**
     * The default HF if the tx type is active on that HF
     * or the first greater HF where the tx is active.
     *
     * @hidden
     */
    protected DEFAULT_HARDFORK: string;
    /**
     * Instantiate a transaction from a data dictionary.
     *
     * Format: { chainId, nonce, gasPrice, gasLimit, to, value, data, accessList,
     * v, r, s }
     *
     * Notes:
     * - `chainId` will be set automatically if not provided
     * - All parameters are optional and have some basic default values
     */
    static fromTxData(txData: AccessListEIP2930TxData, opts?: TxOptions): AccessListEIP2930Transaction;
    /**
     * Instantiate a transaction from the serialized tx.
     *
     * Format: `0x01 || rlp([chainId, nonce, gasPrice, gasLimit, to, value, data, accessList,
     * signatureYParity (v), signatureR (r), signatureS (s)])`
     */
    static fromSerializedTx(serialized: Buffer, opts?: TxOptions): AccessListEIP2930Transaction;
    /**
     * Create a transaction from a values array.
     *
     * Format: `[chainId, nonce, gasPrice, gasLimit, to, value, data, accessList,
     * signatureYParity (v), signatureR (r), signatureS (s)]`
     */
    static fromValuesArray(values: AccessListEIP2930ValuesArray, opts?: TxOptions): AccessListEIP2930Transaction;
    /**
     * This constructor takes the values, validates them, assigns them and freezes the object.
     *
     * It is not recommended to use this constructor directly. Instead use
     * the static factory methods to assist in creating a Transaction object from
     * varying data types.
     */
    constructor(txData: AccessListEIP2930TxData, opts?: TxOptions);
    /**
     * The amount of gas paid for the data in this tx
     */
    getDataFee(): bigint;
    /**
     * The up front amount that an account must have for this transaction to be valid
     */
    getUpfrontCost(): bigint;
    /**
     * Returns a Buffer Array of the raw Buffers of the EIP-2930 transaction, in order.
     *
     * Format: `[chainId, nonce, gasPrice, gasLimit, to, value, data, accessList,
     * signatureYParity (v), signatureR (r), signatureS (s)]`
     *
     * Use {@link AccessListEIP2930Transaction.serialize} to add a transaction to a block
     * with {@link Block.fromValuesArray}.
     *
     * For an unsigned tx this method uses the empty Buffer values for the
     * signature parameters `v`, `r` and `s` for encoding. For an EIP-155 compliant
     * representation for external signing use {@link AccessListEIP2930Transaction.getMessageToSign}.
     */
    raw(): AccessListEIP2930ValuesArray;
    /**
     * Returns the serialized encoding of the EIP-2930 transaction.
     *
     * Format: `0x01 || rlp([chainId, nonce, gasPrice, gasLimit, to, value, data, accessList,
     * signatureYParity (v), signatureR (r), signatureS (s)])`
     *
     * Note that in contrast to the legacy tx serialization format this is not
     * valid RLP any more due to the raw tx type preceding and concatenated to
     * the RLP encoding of the values.
     */
    serialize(): Buffer;
    /**
     * Returns the serialized unsigned tx (hashed or raw), which can be used
     * to sign the transaction (e.g. for sending to a hardware wallet).
     *
     * Note: in contrast to the legacy tx the raw message format is already
     * serialized and doesn't need to be RLP encoded any more.
     *
     * ```javascript
     * const serializedMessage = tx.getMessageToSign(false) // use this for the HW wallet input
     * ```
     *
     * @param hashMessage - Return hashed message if set to true (default: true)
     */
    getMessageToSign(hashMessage?: boolean): Buffer;
    /**
     * Computes a sha3-256 hash of the serialized tx.
     *
     * This method can only be used for signed txs (it throws otherwise).
     * Use {@link AccessListEIP2930Transaction.getMessageToSign} to get a tx hash for the purpose of signing.
     */
    hash(): Buffer;
    /**
     * Computes a sha3-256 hash which can be used to verify the signature
     */
    getMessageToVerifySignature(): Buffer;
    /**
     * Returns the public key of the sender
     */
    getSenderPublicKey(): Buffer;
    _processSignature(v: bigint, r: Buffer, s: Buffer): AccessListEIP2930Transaction;
    /**
     * Returns an object with the JSON representation of the transaction
     */
    toJSON(): JsonTx;
    /**
     * Return a compact error string representation of the object
     */
    errorStr(): string;
    /**
     * Internal helper function to create an annotated error message
     *
     * @param msg Base error message
     * @hidden
     */
    protected _errorMsg(msg: string): string;
}

/**
 * {@link AccessListEIP2930Transaction} data.
 */
declare interface AccessListEIP2930TxData extends TxData {
    /**
     * The transaction's chain ID
     */
    chainId?: BigIntLike;
    /**
     * The access list which contains the addresses/storage slots which the transaction wishes to access
     */
    accessList?: AccessListBuffer | AccessList;
}

/**
 * Buffer values array for an {@link AccessListEIP2930Transaction}
 */
declare type AccessListEIP2930ValuesArray = [
Buffer,
Buffer,
Buffer,
Buffer,
Buffer,
Buffer,
Buffer,
AccessListBuffer,
Buffer?,
Buffer?,
Buffer?
];

declare type AccessListItem = {
    address: PrefixedHexString;
    storageKeys: PrefixedHexString[];
};

declare type AccessListItem_2 = {
    address: PrefixedHexString;
    storageKeys: PrefixedHexString[];
};

declare class Account {
    address: Address;
    balance: Quantity;
    privateKey: Data;
    nonce: Quantity;
    storageRoot: Buffer;
    codeHash: Buffer;
    constructor(address: Address);
    static fromBuffer(buffer: Buffer): any;
    serialize(): Buffer;
}

declare class Account_2 {
    nonce: bigint;
    balance: bigint;
    storageRoot: Buffer;
    codeHash: Buffer;
    static fromAccountData(accountData: AccountData): Account_2;
    static fromRlpSerializedAccount(serialized: Buffer): Account_2;
    static fromValuesArray(values: Buffer[]): Account_2;
    /**
     * This constructor assigns and validates the values.
     * Use the static factory methods to assist in creating an Account from varying data types.
     */
    constructor(nonce?: bigint, balance?: bigint, storageRoot?: Buffer, codeHash?: Buffer);
    private _validate;
    /**
     * Returns a Buffer Array of the raw Buffers for the account, in order.
     */
    raw(): Buffer[];
    /**
     * Returns the RLP serialization of the account as a `Buffer`.
     */
    serialize(): Buffer;
    /**
     * Returns a `Boolean` determining if the account is a contract.
     */
    isContract(): boolean;
    /**
     * Returns a `Boolean` determining if the account is empty complying to the definition of
     * account emptiness in [EIP-161](https://eips.ethereum.org/EIPS/eip-161):
     * "An account is considered empty when it has no code and zero nonce and zero balance."
     */
    isEmpty(): boolean;
}

declare class Account_3 extends SerializableObject<AccountConfig> implements DeserializedObject<AccountConfig> {
    #private;
    get config(): Definitions<AccountConfig>;
    static random(defaultFIL: number, rng?: RandomNumberGenerator, protocol?: AddressProtocol, network?: AddressNetwork): Account_3;
    constructor(options?: Partial<SerializedObject<AccountConfig>> | Partial<DeserializedObject<AccountConfig>>);
    addBalance(val: string | number | bigint): void;
    subtractBalance(val: string | number | bigint): void;
    readonly address: Address_3;
    nonce: number;
    get balance(): Balance;
}

declare type AccountConfig = {
    properties: {
        address: {
            type: Address_3;
            serializedType: SerializedAddress;
            serializedName: "Address";
        };
        balance: {
            type: Balance;
            serializedType: SerializedBalance;
            serializedName: "Balance";
        };
        nonce: {
            type: number;
            serializedType: number;
            serializedName: "Nonce";
        };
    };
};

declare interface AccountData {
    nonce?: BigIntLike;
    balance?: BigIntLike;
    storageRoot?: BufferLike;
    codeHash?: BufferLike;
}

declare type AccountFields = Partial<Pick<Account_2, 'nonce' | 'balance' | 'storageRoot' | 'codeHash'>>;

declare type AccountFields_2 = Partial<Pick<Account_2, 'nonce' | 'balance' | 'storageRoot' | 'codeHash'>>;

declare class AccountManager {
    #private;
    constructor(blockchain: Blockchain);
    get(address: Address, blockNumber?: Buffer | Tag): Promise<Account | null>;
    getRaw(address: Address, blockNumber?: string | Buffer | Tag): Promise<Buffer | null>;
    getStorageAt(address: Address, key: Buffer, blockNumber?: Buffer | Tag): Promise<Buffer>;
    getNonce(address: Address, blockNumber?: QUANTITY | Buffer | Tag): Promise<Quantity>;
    getBalance(address: Address, blockNumber?: QUANTITY | Buffer | Tag): Promise<Quantity>;
    getNonceAndBalance(address: Address, blockNumber?: QUANTITY | Buffer | Tag): Promise<{
        nonce: Quantity;
        balance: Quantity;
    }>;
    getCode(address: Address, blockNumber?: QUANTITY | Buffer | Tag): Promise<Data>;
}

declare class AccountManager_2 extends Manager_2<Account_3, AccountConfig> {
    #private;
    static initialize(base: LevelUp, privateKeyManager: PrivateKeyManager, database: Database_2): Promise<AccountManager_2>;
    constructor(base: LevelUp, privateKeyManager: PrivateKeyManager, database: Database_2);
    putAccount(account: Account_3): Promise<void>;
    getAccount(address: string): Promise<Account_3>;
    /**
     * Returns an array of accounts which we have private keys
     * for. The order is the order in which they were stored.
     * To add a controllable account, use `AccountManager.putAccount(account)`
     * where `account.address.privateKey` is set.
     */
    getControllableAccounts(): Promise<Array<Account_3>>;
    mintFunds(address: string, amount: bigint): Promise<void>;
    transferFunds(from: string, to: string, amount: bigint): Promise<boolean>;
    incrementNonce(address: string): Promise<void>;
}

declare type AccountProof = {
    address: Address;
    balance: Quantity;
    codeHash: Data;
    nonce: Quantity;
    storageHash: Data;
    accountProof: Data[];
    storageProof: StorageProof_2[];
};

declare type AccountState = [
balance: PrefixedHexString,
code: PrefixedHexString,
storage: Array<StoragePair>
];

declare type AddOpcode = {
    opcode: number;
    opcodeName: string;
    baseFee: number;
    gasFunction?: AsyncDynamicGasHandler | SyncDynamicGasHandler;
    logicFunction: OpHandler;
};

declare type AddPrecompile = {
    address: Address_2;
    function: PrecompileFunc;
};

declare class Address extends Address_2 {
    static ByteLength: number;
    constructor(value: Buffer);
    static from<T extends string | Buffer = string | Buffer>(value: T): Address;
    static toBuffer(value: JsonRpcDataInputArg): Buffer;
    static toString(value: JsonRpcDataInputArg): string;
    toJSON(): string;
}

declare class Address_2 {
    readonly buf: Buffer;
    constructor(buf: Buffer);
    /**
     * Returns the zero address.
     */
    static zero(): Address_2;
    /**
     * Returns an Address object from a hex-encoded string.
     * @param str - Hex-encoded address
     */
    static fromString(str: string): Address_2;
    /**
     * Returns an address for a given public key.
     * @param pubKey The two points of an uncompressed key
     */
    static fromPublicKey(pubKey: Buffer): Address_2;
    /**
     * Returns an address for a given private key.
     * @param privateKey A private key must be 256 bits wide
     */
    static fromPrivateKey(privateKey: Buffer): Address_2;
    /**
     * Generates an address for a newly created contract.
     * @param from The address which is creating this new address
     * @param nonce The nonce of the from account
     */
    static generate(from: Address_2, nonce: bigint): Address_2;
    /**
     * Generates an address for a contract created using CREATE2.
     * @param from The address which is creating this new address
     * @param salt A salt
     * @param initCode The init code of the contract being created
     */
    static generate2(from: Address_2, salt: Buffer, initCode: Buffer): Address_2;
    /**
     * Is address equal to another.
     */
    equals(address: Address_2): boolean;
    /**
     * Is address zero.
     */
    isZero(): boolean;
    /**
     * True if address is in the address range defined
     * by EIP-1352
     */
    isPrecompileOrSystemAddress(): boolean;
    /**
     * Returns hex encoding of address.
     */
    toString(): string;
    /**
     * Returns Buffer representation of address.
     */
    toBuffer(): Buffer;
}

declare class Address_3 extends SerializableLiteral<AddressConfig> {
    #private;
    get config(): {};
    static readonly FirstNonSingletonActorId = 100;
    static readonly FirstMinerId = 1000;
    static readonly CHECKSUM_BYTES = 4;
    static readonly CustomBase32Alphabet = "abcdefghijklmnopqrstuvwxyz234567";
    get privateKey(): string | undefined;
    get network(): AddressNetwork;
    get protocol(): AddressProtocol;
    constructor(publicAddress: string, privateKey?: string);
    setPrivateKey(privateKey: string): void;
    signProposal(proposal: StartDealParams): Promise<Buffer>;
    signMessage(message: Message_2): Promise<Buffer>;
    signBuffer(buffer: Buffer): Promise<Buffer>;
    verifySignature(buffer: Buffer, signature: Signature): Promise<boolean>;
    static recoverBLSPublicKey(address: string): Buffer;
    static recoverSECP256K1PublicKey(signature: Signature, message: Uint8Array): Buffer;
    static fromPrivateKey(privateKey: string, protocol?: AddressProtocol, network?: AddressNetwork): Address_3;
    static random(rng?: RandomNumberGenerator, protocol?: AddressProtocol, network?: AddressNetwork): Address_3;
    static parseNetwork(publicAddress: string): AddressNetwork;
    static parseProtocol(publicAddress: string): AddressProtocol;
    /**
     * Creates an AddressProtocol.ID address
     * @param id - A positive integer for the id.
     * @param isSingletonSystemActor - If false, it adds Address.FirstNonSingletonActorId to the id.
     * Almost always `false`. See https://git.io/JtgqL for examples of singleton system actors.
     * @param network - The AddressNetwork prefix for the address; usually AddressNetwork.Testnet for Ganache.
     */
    static fromId(id: number, isSingletonSystemActor?: boolean, isMiner?: boolean, network?: AddressNetwork): Address_3;
    static createChecksum(protocol: AddressProtocol, payload: Buffer): Buffer;
    static validate(inputAddress: string): Address_3;
}

declare interface AddressConfig {
    type: string;
}

/**
 * A type that represents an input that can be converted to an Address.
 */
declare type AddressLike = Address_2 | Buffer | PrefixedHexString;

declare enum AddressNetwork {
    Testnet = "t",
    Mainnet = "f",
    Unknown = "UNKNOWN"
}

declare enum AddressProtocol {
    ID = 0,
    SECP256K1 = 1,
    Actor = 2,
    BLS = 3,
    Unknown = 255
}

declare interface AfterBlockEvent extends RunBlockResult {
    block: Block_3;
}

declare interface AfterTxEvent extends RunTxResult {
    /**
     * The transaction which just got finished
     */
    transaction: TypedTransaction_2;
}

/**
 * Defines the interface for a API.
 * All properties must be `async` callable or return a `Promise`
 */
declare interface Api extends ApiBase {
}

/**
 * Base implementation for an API.
 * All properties must be `async` callable or return a `Promise`
 */
declare class ApiBase {
    readonly [index: string]: (...args: unknown[]) => Promise<unknown>;
}

declare type ArrayToTuple<T extends Readonly<string[]>> = T[number];

declare type AsCall<T> = Flatten<Omit<T, "from"> & {
    readonly from?: string;
}>;

declare type AsPooled<T> = Flatten<Omit<T, "blockNumber" | "blockHash" | "transactionIndex"> & {
    blockNumber: null;
    blockHash: null;
    transactionIndex: null;
}>;

/**
 * This file returns the dynamic parts of opcodes which have dynamic gas
 * These are not pure functions: some edit the size of the memory
 * These functions are therefore not read-only
 */
declare interface AsyncDynamicGasHandler {
    (runState: RunState, gas: bigint, common: Common): Promise<bigint>;
}

declare class AsyncEventEmitter<T extends EventMap> extends EventEmitter {
    emit<E extends keyof T>(event: E & string, ...args: Parameters<T[E]>): boolean;
    once<E extends keyof T>(event: E & string, listener: T[E]): this;
    first<E extends keyof T>(event: E & string, listener: T[E]): this;
    before<E extends keyof T>(event: E & string, target: T[E], listener: T[E]): this;
    after<E extends keyof T>(event: E & string, target: T[E], listener: T[E]): this;
    private beforeOrAfter;
    on<E extends keyof T>(event: E & string, listener: T[E]): this;
    addListener<E extends keyof T>(event: E & string, listener: T[E]): this;
    prependListener<E extends keyof T>(event: E & string, listener: T[E]): this;
    prependOnceListener<E extends keyof T>(event: E & string, listener: T[E]): this;
    removeAllListeners(event?: keyof T & string): this;
    removeListener<E extends keyof T>(event: E & string, listener: T[E]): this;
    eventNames(): Array<keyof T & string>;
    listeners<E extends keyof T>(event: E & string): Array<T[E]>;
    listenerCount(event: keyof T & string): number;
    getMaxListeners(): number;
    setMaxListeners(maxListeners: number): this;
}

declare type AsyncListener<T, R> = ((data: T, callback?: (result?: R) => void) => Promise<R>) | ((data: T, callback?: (result?: R) => void) => void);

declare interface AsyncOpHandler {
    (runState: RunState, common: Common): Promise<void>;
}

declare class Balance extends SerializableLiteral<BalanceConfig> {
    get config(): LiteralDefinition<BalanceConfig>;
    sub(val: string | number | bigint): void;
    add(val: string | number | bigint): void;
    toFIL(): number;
    static FILToLowestDenomination(fil: number): bigint;
    static LowestDenominationToFIL(attoFil: bigint): number;
}

declare interface BalanceConfig {
    type: bigint;
}

declare namespace Base {
    type Option = {
        rawType?: unknown;
        type: unknown;
        hasDefault?: true;
        legacy?: {
            [name: string]: unknown;
        };
        cliType?: CliTypes;
    };
    type ExclusiveGroupOptionName = string;
    type ExclusiveGroup = ExclusiveGroupOptionName[];
    type Config = {
        options: {
            [optionName: string]: Option;
        };
        exclusiveGroups?: ExclusiveGroup[];
    };
}

declare type BaseConfig = {
    properties: {
        [deserializedName: string]: {
            type: any;
            serializedName: string;
            serializedType: any;
        };
    };
};

declare type BaseConfig_2 = {
    type: number | string | Buffer | bigint | null;
};

declare type BaseFeeHeader = BlockHeader & Required<Pick<BlockHeader, "baseFeePerGas">>;

declare type BaseFilterArgs = {
    address?: string | string[];
    topics?: Topic[];
};

declare class BaseJsonRpcType {
    protected bufferValue: Buffer | null;
    private [inspect];
    constructor(value: JsonRpcInputArg);
    toString(): string | null;
    toBuffer(): Buffer;
    valueOf(): any;
    toJSON(): string | null;
    isNull(): boolean;
}

declare interface BaseOpts {
    /**
     * String identifier ('byzantium') for hardfork or {@link Hardfork} enum.
     *
     * Default: Hardfork.London
     */
    hardfork?: string | Hardfork_2;
    /**
     * Selected EIPs which can be activated, please use an array for instantiation
     * (e.g. `eips: [ 2537, ]`)
     *
     * Currently supported:
     *
     * - [EIP-2537](https://eips.ethereum.org/EIPS/eip-2537) - BLS12-381 precompiles
     */
    eips?: number[];
}

declare class BaseTransaction {
    type: Quantity;
    nonce: Quantity;
    gas: Quantity;
    to: Address;
    value: Quantity;
    data: Data;
    v: Quantity | null;
    r: Quantity | null;
    s: Quantity | null;
    effectiveGasPrice: Quantity;
    from: Address | null;
    common: Common;
    index: Quantity;
    hash: Data;
    blockNumber: Quantity;
    blockHash: Data;
    constructor(common: Common, extra?: GanacheRawExtraTx);
    setExtra(raw: GanacheRawExtraTx): void;
    calculateIntrinsicGas(): bigint;
}

/**
 * This base class will likely be subject to further
 * refactoring along the introduction of additional tx types
 * on the Ethereum network.
 *
 * It is therefore not recommended to use directly.
 */
declare abstract class BaseTransaction_2<TransactionObject> {
    private readonly _type;
    readonly nonce: bigint;
    readonly gasLimit: bigint;
    readonly to?: Address_2;
    readonly value: bigint;
    readonly data: Buffer;
    readonly v?: bigint;
    readonly r?: bigint;
    readonly s?: bigint;
    readonly common: Common;
    protected cache: TransactionCache;
    protected readonly txOptions: TxOptions;
    /**
     * List of tx type defining EIPs,
     * e.g. 1559 (fee market) and 2930 (access lists)
     * for FeeMarketEIP1559Transaction objects
     */
    protected activeCapabilities: number[];
    /**
     * The default chain the tx falls back to if no Common
     * is provided and if the chain can't be derived from
     * a passed in chainId (only EIP-2718 typed txs) or
     * EIP-155 signature (legacy txs).
     *
     * @hidden
     */
    protected DEFAULT_CHAIN: Chain;
    /**
     * The default HF if the tx type is active on that HF
     * or the first greater HF where the tx is active.
     *
     * @hidden
     */
    protected DEFAULT_HARDFORK: string | Hardfork_2;
    constructor(txData: TxData | AccessListEIP2930TxData | FeeMarketEIP1559TxData, opts: TxOptions);
    /**
     * Returns the transaction type.
     *
     * Note: legacy txs will return tx type `0`.
     */
    get type(): number;
    /**
     * Checks if a tx type defining capability is active
     * on a tx, for example the EIP-1559 fee market mechanism
     * or the EIP-2930 access list feature.
     *
     * Note that this is different from the tx type itself,
     * so EIP-2930 access lists can very well be active
     * on an EIP-1559 tx for example.
     *
     * This method can be useful for feature checks if the
     * tx type is unknown (e.g. when instantiated with
     * the tx factory).
     *
     * See `Capabilites` in the `types` module for a reference
     * on all supported capabilities.
     */
    supports(capability: Capability_2): boolean;
    /**
     * Checks if the transaction has the minimum amount of gas required
     * (DataFee + TxFee + Creation Fee).
     */
    validate(): boolean;
    validate(stringError: false): boolean;
    validate(stringError: true): string[];
    protected _validateYParity(): void;
    /**
     * EIP-2: All transaction signatures whose s-value is greater than secp256k1n/2are considered invalid.
     * Reasoning: https://ethereum.stackexchange.com/a/55728
     */
    protected _validateHighS(): void;
    /**
     * The minimum amount of gas the tx must have (DataFee + TxFee + Creation Fee)
     */
    getBaseFee(): bigint;
    /**
     * The amount of gas paid for the data in this tx
     */
    getDataFee(): bigint;
    /**
     * The up front amount that an account must have for this transaction to be valid
     */
    abstract getUpfrontCost(): bigint;
    /**
     * If the tx's `to` is to the creation address
     */
    toCreationAddress(): boolean;
    /**
     * Returns a Buffer Array of the raw Buffers of this transaction, in order.
     *
     * Use {@link BaseTransaction.serialize} to add a transaction to a block
     * with {@link Block.fromValuesArray}.
     *
     * For an unsigned tx this method uses the empty Buffer values for the
     * signature parameters `v`, `r` and `s` for encoding. For an EIP-155 compliant
     * representation for external signing use {@link BaseTransaction.getMessageToSign}.
     */
    abstract raw(): TxValuesArray | AccessListEIP2930ValuesArray | FeeMarketEIP1559ValuesArray;
    /**
     * Returns the encoding of the transaction.
     */
    abstract serialize(): Buffer;
    abstract getMessageToSign(hashMessage: false): Buffer | Buffer[];
    abstract getMessageToSign(hashMessage?: true): Buffer;
    abstract hash(): Buffer;
    abstract getMessageToVerifySignature(): Buffer;
    isSigned(): boolean;
    /**
     * Determines if the signature is valid
     */
    verifySignature(): boolean;
    /**
     * Returns the sender's address
     */
    getSenderAddress(): Address_2;
    /**
     * Returns the public key of the sender
     */
    abstract getSenderPublicKey(): Buffer;
    /**
     * Signs a transaction.
     *
     * Note that the signed tx is returned as a new object,
     * use as follows:
     * ```javascript
     * const signedTx = tx.sign(privateKey)
     * ```
     */
    sign(privateKey: Buffer): TransactionObject;
    /**
     * Returns an object with the JSON representation of the transaction
     */
    abstract toJSON(): JsonTx;
    protected abstract _processSignature(v: bigint, r: Buffer, s: Buffer): TransactionObject;
    /**
     * Does chain ID checks on common and returns a common
     * to be used on instantiation
     * @hidden
     *
     * @param common - {@link Common} instance from tx options
     * @param chainId - Chain ID from tx options (typed txs) or signature (legacy tx)
     */
    protected _getCommon(common?: Common, chainId?: BigIntLike): Common;
    /**
     * Validates that an object with BigInt values cannot exceed the specified bit limit.
     * @param values Object containing string keys and BigInt values
     * @param bits Number of bits to check (64 or 256)
     * @param cannotEqual Pass true if the number also cannot equal one less the maximum value
     */
    protected _validateCannotExceedMaxInteger(values: {
        [key: string]: bigint | undefined;
    }, bits?: number, cannotEqual?: boolean): void;
    protected static _validateNotArray(values: {
        [key: string]: any;
    }): void;
    /**
     * Return a compact error string representation of the object
     */
    abstract errorStr(): string;
    /**
     * Internal helper function to create an annotated error message
     *
     * @param msg Base error message
     * @hidden
     */
    protected abstract _errorMsg(msg: string): string;
    /**
     * Returns the shared error postfix part for _error() method
     * tx type implementations.
     */
    protected _getSharedErrorPostfix(): string;
}

/**
 * Abstract interface with common transaction receipt fields
 */
declare interface BaseTxReceipt {
    /**
     * Cumulative gas used in the block including this tx
     */
    cumulativeBlockGasUsed: bigint;
    /**
     * Bloom bitvector
     */
    bitvector: Buffer;
    /**
     * Logs emitted
     */
    logs: Log[];
}

declare type BatchDBOp = PutBatch_2 | DelBatch_2;

declare interface BatchedCallback {
    (err?: Error, response?: (JsonRpcResponse | JsonRpcError)[]): void;
}

declare class BeaconEntry extends SerializableObject<BeaconEntryConfig> implements DeserializedObject<BeaconEntryConfig> {
    get config(): Definitions<BeaconEntryConfig>;
    constructor(options?: Partial<SerializedObject<BeaconEntryConfig>> | Partial<DeserializedObject<BeaconEntryConfig>>);
    round: number;
    data: Buffer;
}

declare interface BeaconEntryConfig {
    properties: {
        round: {
            type: number;
            serializedType: number;
            serializedName: "Round";
        };
        data: {
            type: Buffer;
            serializedType: string;
            serializedName: "Data";
        };
    };
}

declare type BigIntLike = bigint | PrefixedHexString | number | Buffer;

declare class Block {
    /**
     *  Base fee per gas for blocks without a parent containing a base fee per gas.
     */
    static readonly INITIAL_BASE_FEE_PER_GAS: 1000000000n;
    protected _size: number;
    protected _raw: EthereumRawBlockHeader;
    protected _common: Common;
    protected _rawTransactions: TypedDatabaseTransaction[];
    protected _rawTransactionMetaData: GanacheRawBlockTransactionMetaData[];
    header: BlockHeader;
    constructor(serialized: Buffer, common: Common);
    private _hash;
    hash(): Data;
    getTransactions(): (LegacyTransaction | EIP2930AccessListTransaction | EIP1559FeeMarketTransaction)[];
    toJSON<IncludeTransactions extends boolean>(includeFullTransactions: IncludeTransactions): {
        size: Quantity;
        transactions: IncludeTransactions extends true ? TypedTransactionJSON[] : Data[];
        uncles: Data[];
        parentHash: Data;
        sha3Uncles: Data;
        miner: Data;
        stateRoot: Data;
        transactionsRoot: Data;
        receiptsRoot: Data;
        logsBloom: Data;
        difficulty: Quantity;
        totalDifficulty: Quantity;
        number: Quantity;
        gasLimit: Quantity;
        gasUsed: Quantity;
        timestamp: Quantity;
        extraData: Data;
        mixHash: Data;
        nonce: Data;
        baseFeePerGas?: Quantity;
        hash: Data;
    };
    getTxFn<IncludeTransactions extends boolean>(include?: IncludeTransactions): (tx: TypedTransaction) => ReturnType<TypedTransaction["toJSON"]> | Data;
    static fromParts(rawHeader: EthereumRawBlockHeader, txs: TypedDatabaseTransaction[], totalDifficulty: Buffer, extraTxs: GanacheRawBlockTransactionMetaData[], size: number, common: Common): Block;
    static calcNextBaseFeeBigInt(parentHeader: BaseFeeHeader): bigint;
    static calcNBlocksMaxBaseFee(blocks: number, parentHeader: BaseFeeHeader): bigint;
    static calcNextBaseFee(parentBlock: Block): bigint;
}

declare type Block_2 = {
    header: {
        number: bigint;
        cliqueSigner(): Address_2;
        coinbase: Address_2;
        timestamp: bigint;
        difficulty: bigint;
        prevRandao: Buffer;
        gasLimit: bigint;
        baseFeePerGas?: bigint;
    };
};

/**
 * An object that represents the block.
 */
declare class Block_3 {
    readonly header: BlockHeader_2;
    readonly transactions: TypedTransaction_2[];
    readonly uncleHeaders: BlockHeader_2[];
    readonly txTrie: Trie;
    readonly _common: Common;
    /**
     * Static constructor to create a block from a block data dictionary
     *
     * @param blockData
     * @param opts
     */
    static fromBlockData(blockData?: BlockData, opts?: BlockOptions): Block_3;
    /**
     * Static constructor to create a block from a RLP-serialized block
     *
     * @param serialized
     * @param opts
     */
    static fromRLPSerializedBlock(serialized: Buffer, opts?: BlockOptions): Block_3;
    /**
     * Static constructor to create a block from an array of Buffer values
     *
     * @param values
     * @param opts
     */
    static fromValuesArray(values: BlockBuffer, opts?: BlockOptions): Block_3;
    /**
     * Creates a new block object from Ethereum JSON RPC.
     *
     * @param blockParams - Ethereum JSON RPC of block (eth_getBlockByNumber)
     * @param uncles - Optional list of Ethereum JSON RPC of uncles (eth_getUncleByBlockHashAndIndex)
     * @param options - An object describing the blockchain
     */
    static fromRPC(blockData: JsonRpcBlock, uncles?: any[], opts?: BlockOptions): Block_3;
    /**
     *  Method to retrieve a block from the provider and format as a {@link Block}
     * @param provider an Ethers JsonRPCProvider
     * @param blockTag block hash or block number to be run
     * @param opts {@link BlockOptions}
     * @returns the block specified by `blockTag`
     */
    static fromEthersProvider: (provider: ethers.providers.JsonRpcProvider | string, blockTag: string | bigint, opts: BlockOptions) => Promise<Block_3>;
    /**
     * This constructor takes the values, validates them, assigns them and freezes the object.
     * Use the static factory methods to assist in creating a Block object from varying data types and options.
     */
    constructor(header?: BlockHeader_2, transactions?: TypedTransaction_2[], uncleHeaders?: BlockHeader_2[], opts?: BlockOptions);
    /**
     * Returns a Buffer Array of the raw Buffers of this block, in order.
     */
    raw(): BlockBuffer;
    /**
     * Returns the hash of the block.
     */
    hash(): Buffer;
    /**
     * Determines if this block is the genesis block.
     */
    isGenesis(): boolean;
    /**
     * Returns the rlp encoding of the block.
     */
    serialize(): Buffer;
    /**
     * Generates transaction trie for validation.
     */
    genTxTrie(): Promise<void>;
    /**
     * Validates the transaction trie by generating a trie
     * and do a check on the root hash.
     */
    validateTransactionsTrie(): Promise<boolean>;
    /**
     * Validates transaction signatures and minimum gas requirements.
     *
     * @param stringError - If `true`, a string with the indices of the invalid txs is returned.
     */
    validateTransactions(): boolean;
    validateTransactions(stringError: false): boolean;
    validateTransactions(stringError: true): string[];
    /**
     * Validates the block data, throwing if invalid.
     * This can be checked on the Block itself without needing access to any parent block
     * It checks:
     * - All transactions are valid
     * - The transactions trie is valid
     * - The uncle hash is valid
     * @param onlyHeader if only passed the header, skip validating txTrie and unclesHash (default: false)
     */
    validateData(onlyHeader?: boolean): Promise<void>;
    /**
     * Validates the uncle's hash.
     */
    validateUnclesHash(): boolean;
    /**
     * Consistency checks for uncles included in the block, if any.
     *
     * Throws if invalid.
     *
     * The rules for uncles checked are the following:
     * Header has at most 2 uncles.
     * Header does not count an uncle twice.
     */
    validateUncles(): void;
    /**
     * Returns the canonical difficulty for this block.
     *
     * @param parentBlock - the parent of this `Block`
     */
    ethashCanonicalDifficulty(parentBlock: Block_3): bigint;
    /**
     * Validates if the block gasLimit remains in the boundaries set by the protocol.
     * Throws if invalid
     *
     * @param parentBlock - the parent of this `Block`
     */
    validateGasLimit(parentBlock: Block_3): void;
    /**
     * Returns the block in JSON format.
     */
    toJSON(): JsonBlock;
    /**
     * Return a compact error string representation of the object
     */
    errorStr(): string;
    /**
     * Internal helper function to create an annotated error message
     *
     * @param msg Base error message
     * @hidden
     */
    protected _errorMsg(msg: string): string;
}

declare type BlockBodyBuffer = [TransactionsBuffer, UncleHeadersBuffer];

declare type BlockBuffer = [BlockHeaderBuffer, TransactionsBuffer, UncleHeadersBuffer];

declare class BlockBuilder {
    /**
     * The cumulative gas used by the transactions added to the block.
     */
    gasUsed: bigint;
    private readonly vm;
    private blockOpts;
    private headerData;
    private transactions;
    private transactionResults;
    private checkpointed;
    private reverted;
    private built;
    get transactionReceipts(): TxReceipt[];
    constructor(vm: VM, opts: BuildBlockOpts);
    /**
     * Throws if the block has already been built or reverted.
     */
    private checkStatus;
    /**
     * Calculates and returns the transactionsTrie for the block.
     */
    transactionsTrie(): Promise<Buffer>;
    /**
     * Calculates and returns the logs bloom for the block.
     */
    logsBloom(): Buffer;
    /**
     * Calculates and returns the receiptTrie for the block.
     */
    receiptTrie(): Promise<Buffer>;
    /**
     * Adds the block miner reward to the coinbase account.
     */
    private rewardMiner;
    /**
     * Run and add a transaction to the block being built.
     * Please note that this modifies the state of the VM.
     * Throws if the transaction's gasLimit is greater than
     * the remaining gas in the block.
     */
    addTransaction(tx: TypedTransaction_2): Promise<RunTxResult>;
    /**
     * Reverts the checkpoint on the StateManager to reset the state from any transactions that have been run.
     */
    revert(): Promise<void>;
    /**
     * This method returns the finalized block.
     * It also:
     *  - Assigns the reward for miner (PoW)
     *  - Commits the checkpoint on the StateManager
     *  - Sets the tip of the VM's blockchain to this block
     * For PoW, optionally seals the block with params `nonce` and `mixHash`,
     * which is validated along with the block number and difficulty by ethash.
     * For PoA, please pass `blockOption.cliqueSigner` into the buildBlock constructor,
     * as the signer will be awarded the txs amount spent on gas as they are added.
     */
    build(sealOpts?: SealBlockOpts): Promise<Block_3>;
}

declare class Blockchain extends Emittery<BlockchainTypedEvents> {
    #private;
    blocks: BlockManager;
    blockLogs: BlockLogManager;
    transactions: TransactionManager;
    transactionReceipts: TransactionReceiptManager;
    storageKeys: Database["storageKeys"];
    accounts: AccountManager;
    vm: VM;
    trie: GanacheTrie;
    common: Common;
    fallback: Fork;
    /**
     * Initializes the underlying Database and handles synchronization between
     * the API and the database.
     *
     * Emits a `ready` event once the database and all dependencies are fully
     * initialized.
     * @param options -
     */
    constructor(options: EthereumInternalOptions, coinbase: Address, fallback?: Fork);
    initialize(initialAccounts: Account[]): Promise<void>;
    coinbase: Address;
    getMixHash(data: Buffer): Buffer;
    isStarted: () => boolean;
    mine: (maxTransactions: number | Capacity, onlyOneBlock?: boolean, timestamp?: number) => Promise<{
        transactions: TypedTransaction[];
        blockNumber: bigint;
    }>;
    pause(): void;
    resume(_threads?: number): Promise<{
        transactions: TypedTransaction[];
        blockNumber: bigint;
    }>;
    createVmFromStateTrie: (stateTrie: GanacheTrie | ForkTrie, allowUnlimitedContractSize: boolean, activatePrecompile: boolean, common?: Common) => Promise<VM>;
    /**
     * @param milliseconds - the number of milliseconds to adjust the time by.
     * Negative numbers are treated as 0.
     * @returns the total time offset *in milliseconds*
     */
    increaseTime(milliseconds: number): number;
    /**
     * Adjusts the internal time adjustment such that the provided time is considered the "current" time.
     * @param newTime - the time (in milliseconds) that will be considered the "current" time
     * @returns the total time offset *in milliseconds*
     */
    setTimeDiff(newTime: number): number;
    snapshot(): number;
    revert(snapshotId: Quantity): Promise<boolean>;
    queueTransaction(transaction: TypedTransaction, secretKey?: Data): Promise<Data>;
    simulateTransaction(transaction: SimulationTransaction, parentBlock: Block, overrides: CallOverrides): Promise<Data>;
    isPostMerge: boolean;
    /**
     * traceTransaction
     *
     * Run a previously-run transaction in the same state in which it occurred at the time it was run.
     * This will return the vm-level trace output for debugging purposes.
     *
     * Strategy:
     *
     *  1. Find block where transaction occurred
     *  2. Set state root of that block
     *  3. Rerun every transaction in that block prior to and including the requested transaction
     *  4. Send trace results back.
     *
     * @param transactionHash -
     * @param options -
     */
    traceTransaction(transactionHash: string, options: TraceTransactionOptions): Promise<{
        gas: Quantity;
        structLogs: StructLog[];
        returnValue: string;
        storage: Record<string, {
            key: Data;
            value: Data;
        }>;
    }>;
    /**
     * storageRangeAt
     *
     * Returns a contract's storage given a starting key and max number of
     * entries to return.
     *
     * Strategy:
     *
     *  1. Find block where transaction occurred
     *  2. Set state root of that block
     *  3. Use contract address storage trie to get the storage keys from the transaction
     *  4. Sort and filter storage keys using the startKey and maxResult
     *  5. Rerun every transaction in that block prior to and including the requested transaction
     *  6. Send storage results back
     *
     * @param blockHash -
     * @param txIndex -
     * @param contractAddress -
     * @param startKey -
     * @param maxResult -
     */
    storageRangeAt(blockHash: string, txIndex: number, contractAddress: string, startKey: string, maxResult: number): Promise<StorageRangeAtResult>;
    toggleStepEvent(enable: boolean): void;
    /**
     * Gracefully shuts down the blockchain service and all of its dependencies.
     */
    stop(): Promise<void>;
}

/**
 * This class stores and interacts with blocks.
 */
declare class Blockchain_2 implements BlockchainInterface {
    consensus: Consensus;
    db: AbstractLevel<string | Buffer | Uint8Array, string | Buffer, string | Buffer>;
    dbManager: DBManager;
    private _genesisBlock?; /** The genesis block of this blockchain */
    private _customGenesisState?; /** Custom genesis state */
    /**
     * The following two heads and the heads stored within the `_heads` always point
     * to a hash in the canonical chain and never to a stale hash.
     * With the exception of `_headHeaderHash` this does not necessarily need to be
     * the hash with the highest total difficulty.
     */
    /** The hash of the current head block */
    private _headBlockHash?;
    /** The hash of the current head header */
    private _headHeaderHash?;
    /**
     * A Map which stores the head of each key (for instance the "vm" key) which is
     * updated along a {@link Blockchain.iterator} method run and can be used to (re)run
     * non-verified blocks (for instance in the VM).
     */
    private _heads;
    protected _isInitialized: boolean;
    private _lock;
    _common: Common;
    private _hardforkByHeadBlockNumber;
    private readonly _validateConsensus;
    private readonly _validateBlocks;
    /**
     * Safe creation of a new Blockchain object awaiting the initialization function,
     * encouraged method to use when creating a blockchain object.
     *
     * @param opts Constructor options, see {@link BlockchainOptions}
     */
    static create(opts?: BlockchainOptions): Promise<Blockchain_2>;
    /**
     * Creates a blockchain from a list of block objects,
     * objects must be readable by {@link Block.fromBlockData}
     *
     * @param blockData List of block objects
     * @param opts Constructor options, see {@link BlockchainOptions}
     */
    static fromBlocksData(blocksData: BlockData[], opts?: BlockchainOptions): Promise<Blockchain_2>;
    /**
     * Creates new Blockchain object.
     *
     * @deprecated The direct usage of this constructor is discouraged since
     * non-finalized async initialization might lead to side effects. Please
     * use the async {@link Blockchain.create} constructor instead (same API).
     *
     * @param opts An object with the options that this constructor takes. See
     * {@link BlockchainOptions}.
     */
    protected constructor(opts?: BlockchainOptions);
    /**
     * Returns a deep copy of this {@link Blockchain} instance.
     *
     * Note: this does not make a copy of the underlying db
     * since it is unknown if the source is on disk or in memory.
     * This should not be a significant issue in most usage since
     * the queries will only reflect the instance's known data.
     * If you would like this copied blockchain to use another db
     * set the {@link db} of this returned instance to a copy of
     * the original.
     */
    copy(): Blockchain_2;
    /**
     * This method is called in {@link Blockchain.create} and either sets up the DB or reads
     * values from the DB and makes these available to the consumers of
     * Blockchain.
     *
     * @hidden
     */
    private _init;
    /**
     * Run a function after acquiring a lock. It is implied that we have already
     * initialized the module (or we are calling this from the init function, like
     * `_setCanonicalGenesisBlock`)
     * @param action - function to run after acquiring a lock
     * @hidden
     */
    private runWithLock;
    /**
     * Returns the specified iterator head.
     *
     * This function replaces the old {@link Blockchain.getHead} method. Note that
     * the function deviates from the old behavior and returns the
     * genesis hash instead of the current head block if an iterator
     * has not been run. This matches the behavior of {@link Blockchain.iterator}.
     *
     * @param name - Optional name of the iterator head (default: 'vm')
     */
    getIteratorHead(name?: string): Promise<Block_3>;
    /**
     * Returns the specified iterator head.
     *
     * @param name - Optional name of the iterator head (default: 'vm')
     *
     * @deprecated use {@link Blockchain.getIteratorHead} instead.
     * Note that {@link Blockchain.getIteratorHead} doesn't return
     * the `headHeader` but the genesis hash as an initial iterator
     * head value (now matching the behavior of {@link Blockchain.iterator}
     * on a first run)
     */
    getHead(name?: string): Promise<Block_3>;
    /**
     * Returns the latest header in the canonical chain.
     */
    getCanonicalHeadHeader(): Promise<BlockHeader_2>;
    /**
     * Returns the latest full block in the canonical chain.
     */
    getCanonicalHeadBlock(): Promise<Block_3>;
    /**
     * Adds blocks to the blockchain.
     *
     * If an invalid block is met the function will throw, blocks before will
     * nevertheless remain in the DB. If any of the saved blocks has a higher
     * total difficulty than the current max total difficulty the canonical
     * chain is rebuilt and any stale heads/hashes are overwritten.
     * @param blocks - The blocks to be added to the blockchain
     */
    putBlocks(blocks: Block_3[]): Promise<void>;
    /**
     * Adds a block to the blockchain.
     *
     * If the block is valid and has a higher total difficulty than the current
     * max total difficulty, the canonical chain is rebuilt and any stale
     * heads/hashes are overwritten.
     * @param block - The block to be added to the blockchain
     */
    putBlock(block: Block_3): Promise<void>;
    /**
     * Adds many headers to the blockchain.
     *
     * If an invalid header is met the function will throw, headers before will
     * nevertheless remain in the DB. If any of the saved headers has a higher
     * total difficulty than the current max total difficulty the canonical
     * chain is rebuilt and any stale heads/hashes are overwritten.
     * @param headers - The headers to be added to the blockchain
     */
    putHeaders(headers: Array<any>): Promise<void>;
    /**
     * Adds a header to the blockchain.
     *
     * If this header is valid and it has a higher total difficulty than the current
     * max total difficulty, the canonical chain is rebuilt and any stale
     * heads/hashes are overwritten.
     * @param header - The header to be added to the blockchain
     */
    putHeader(header: BlockHeader_2): Promise<void>;
    /**
     * Entrypoint for putting any block or block header. Verifies this block,
     * checks the total TD: if this TD is higher than the current highest TD, we
     * have thus found a new canonical block and have to rewrite the canonical
     * chain. This also updates the head block hashes. If any of the older known
     * canonical chains just became stale, then we also reset every _heads header
     * which points to a stale header to the last verified header which was in the
     * old canonical chain, but also in the new canonical chain. This thus rolls
     * back these headers so that these can be updated to the "new" canonical
     * header using the iterator method.
     * @hidden
     */
    private _putBlockOrHeader;
    /**
     * Validates a block header, throwing if invalid. It is being validated against the reported `parentHash`.
     * It verifies the current block against the `parentHash`:
     * - The `parentHash` is part of the blockchain (it is a valid header)
     * - Current block number is parent block number + 1
     * - Current block has a strictly higher timestamp
     * - Additional PoW checks ->
     *   - Current block has valid difficulty and gas limit
     *   - In case that the header is an uncle header, it should not be too old or young in the chain.
     * - Additional PoA clique checks ->
     *   - Checks on coinbase and mixHash
     *   - Current block has a timestamp diff greater or equal to PERIOD
     *   - Current block has difficulty correctly marked as INTURN or NOTURN
     * @param header - header to be validated
     * @param height - If this is an uncle header, this is the height of the block that is including it
     */
    validateHeader(header: BlockHeader_2, height?: bigint): Promise<void>;
    /**
     * Validates a block, by validating the header against the current chain, any uncle headers, and then
     * whether the block is internally consistent
     * @param block block to be validated
     */
    validateBlock(block: Block_3): Promise<void>;
    /**
     * The following rules are checked in this method:
     * Uncle Header is a valid header.
     * Uncle Header is an orphan, i.e. it is not one of the headers of the canonical chain.
     * Uncle Header has a parentHash which points to the canonical chain. This parentHash is within the last 7 blocks.
     * Uncle Header is not already included as uncle in another block.
     * @param block - block for which uncles are being validated
     */
    private _validateUncleHeaders;
    /**
     * Gets a block by its hash or number.  If a number is provided, the returned
     * block will be the canonical block at that number in the chain
     *
     * @param blockId - The block's hash or number. If a hash is provided, then
     * this will be immediately looked up, otherwise it will wait until we have
     * unlocked the DB
     */
    getBlock(blockId: Buffer | number | bigint): Promise<Block_3>;
    /**
     * Gets total difficulty for a block specified by hash and number
     */
    getTotalDifficulty(hash: Buffer, number?: bigint): Promise<bigint>;
    /**
     * Looks up many blocks relative to blockId Note: due to `GetBlockHeaders
     * (0x03)` (ETH wire protocol) we have to support skip/reverse as well.
     * @param blockId - The block's hash or number
     * @param maxBlocks - Max number of blocks to return
     * @param skip - Number of blocks to skip apart
     * @param reverse - Fetch blocks in reverse
     */
    getBlocks(blockId: Buffer | bigint | number, maxBlocks: number, skip: number, reverse: boolean): Promise<Block_3[]>;
    /**
     * Given an ordered array, returns an array of hashes that are not in the
     * blockchain yet. Uses binary search to find out what hashes are missing.
     * Therefore, the array needs to be ordered upon number.
     * @param hashes - Ordered array of hashes (ordered on `number`).
     */
    selectNeededHashes(hashes: Array<Buffer>): Promise<Buffer[]>;
    /**
     * Completely deletes a block from the blockchain including any references to
     * this block. If this block was in the canonical chain, then also each child
     * block of this block is deleted Also, if this was a canonical block, each
     * head header which is part of this now stale chain will be set to the
     * parentHeader of this block An example reason to execute is when running the
     * block in the VM invalidates this block: this will then reset the canonical
     * head to the past block (which has been validated in the past by the VM, so
     * we can be sure it is correct).
     * @param blockHash - The hash of the block to be deleted
     */
    delBlock(blockHash: Buffer): Promise<void>;
    /**
     * @hidden
     */
    private _delBlock;
    /**
     * Updates the `DatabaseOperation` list to delete a block from the DB,
     * identified by `blockHash` and `blockNumber`. Deletes fields from `Header`,
     * `Body`, `HashToNumber` and `TotalDifficulty` tables. If child blocks of
     * this current block are in the canonical chain, delete these as well. Does
     * not actually commit these changes to the DB. Sets `_headHeaderHash` and
     * `_headBlockHash` to `headHash` if any of these matches the current child to
     * be deleted.
     * @param blockHash - the block hash to delete
     * @param blockNumber - the number corresponding to the block hash
     * @param headHash - the current head of the chain (if null, do not update
     * `_headHeaderHash` and `_headBlockHash`)
     * @param ops - the `DatabaseOperation` list to add the delete operations to
     * @hidden
     */
    private _delChild;
    /**
     * Iterates through blocks starting at the specified iterator head and calls
     * the onBlock function on each block. The current location of an iterator
     * head can be retrieved using {@link Blockchain.getIteratorHead}.
     *
     * @param name - Name of the state root head
     * @param onBlock - Function called on each block with params (block, reorg)
     * @param maxBlocks - How many blocks to run. By default, run all unprocessed blocks in the canonical chain.
     * @param releaseLockOnCallback - Do not lock the blockchain for running the callback (default: `false`)
     * @returns number of blocks actually iterated
     */
    iterator(name: string, onBlock: OnBlock, maxBlocks?: number, releaseLockOnCallback?: boolean): Promise<number>;
    /**
     * Set header hash of a certain `tag`.
     * When calling the iterator, the iterator will start running the first child block after the header hash currently stored.
     * @param tag - The tag to save the headHash to
     * @param headHash - The head hash to save
     */
    setIteratorHead(tag: string, headHash: Buffer): Promise<void>;
    /**
     * Find the common ancestor of the new block and the old block.
     * @param newHeader - the new block header
     */
    private findCommonAncestor;
    /**
     * Pushes DB operations to delete canonical number assignments for specified
     * block number and above. This only deletes `NumberToHash` references and not
     * the blocks themselves. Note: this does not write to the DB but only pushes
     * to a DB operations list.
     * @param blockNumber - the block number from which we start deleting
     * canonical chain assignments (including this block)
     * @param headHash - the hash of the current canonical chain head. The _heads
     * reference matching any hash of any of the deleted blocks will be set to
     * this
     * @param ops - the DatabaseOperation list to write DatabaseOperations to
     * @hidden
     */
    private _deleteCanonicalChainReferences;
    /**
     * Given a `header`, put all operations to change the canonical chain directly
     * into `ops`. This walks the supplied `header` backwards. It is thus assumed
     * that this header should be canonical header. For each header the
     * corresponding hash corresponding to the current canonical chain in the DB
     * is checked. If the number => hash reference does not correspond to the
     * reference in the DB, we overwrite this reference with the implied number =>
     * hash reference Also, each `_heads` member is checked; if these point to a
     * stale hash, then the hash which we terminate the loop (i.e. the first hash
     * which matches the number => hash of the implied chain) is put as this stale
     * head hash. The same happens to _headBlockHash.
     * @param header - The canonical header.
     * @param ops - The database operations list.
     * @hidden
     */
    private _rebuildCanonical;
    /**
     * Builds the `DatabaseOperation[]` list which describes the DB operations to
     * write the heads, head header hash and the head header block to the DB
     * @hidden
     */
    private _saveHeadOps;
    /**
     * Gets the `DatabaseOperation[]` list to save `_heads`, `_headHeaderHash` and
     * `_headBlockHash` and writes these to the DB
     * @hidden
     */
    private _saveHeads;
    /**
     * Gets a header by hash and number. Header can exist outside the canonical
     * chain
     *
     * @hidden
     */
    private _getHeader;
    protected checkAndTransitionHardForkByNumber(number: bigint, td?: BigIntLike): void;
    /**
     * Gets a header by number. Header must be in the canonical chain
     */
    getCanonicalHeader(number: bigint): Promise<BlockHeader_2>;
    /**
     * This method either returns a Buffer if there exists one in the DB or if it
     * does not exist (DB throws a `NotFoundError`) then return false If DB throws
     * any other error, this function throws.
     * @param number
     */
    safeNumberToHash(number: bigint): Promise<Buffer | false>;
    /**
     * The genesis {@link Block} for the blockchain.
     */
    get genesisBlock(): Block_3;
    /**
     * Creates a genesis {@link Block} for the blockchain with params from {@link Common.genesis}
     * @param stateRoot The genesis stateRoot
     */
    createGenesisBlock(stateRoot: Buffer): Block_3;
    /**
     * Returns the genesis state of the blockchain.
     * All values are provided as hex-prefixed strings.
     */
    genesisState(): GenesisState;
}

declare class Blockchain_3 extends Emittery<BlockchainEvents> {
    #private;
    tipsetManager: TipsetManager | null;
    blockHeaderManager: BlockHeaderManager | null;
    accountManager: AccountManager_2 | null;
    privateKeyManager: PrivateKeyManager | null;
    signedMessagesManager: SignedMessageManager | null;
    blockMessagesManager: BlockMessagesManager | null;
    dealInfoManager: DealInfoManager | null;
    readonly miner: Address_3;
    get minerEnabled(): boolean;
    messagePool: Array<SignedMessage>;
    readonly options: FilecoinInternalOptions;
    private ipfsServer;
    private miningTimeout;
    private rng;
    get dbDirectory(): string | null;
    private ready;
    private stopped;
    constructor(options: FilecoinInternalOptions);
    initialize(): Promise<void>;
    waitForReady(): Promise<unknown>;
    /**
     * Gracefully shuts down the blockchain service and all of its dependencies.
     */
    stop(): Promise<void>;
    get ipfs(): any | null;
    private intervalMine;
    enableMiner(): Promise<void>;
    disableMiner(): Promise<void>;
    genesisTipset(): Tipset;
    latestTipset(): Tipset;
    push(message: Message_2, spec: MessageSendSpec): Promise<SignedMessage>;
    pushSigned(signedMessage: SignedMessage, acquireLock?: boolean): Promise<RootCID>;
    mpoolClear(local: boolean): Promise<void>;
    mpoolPending(): Promise<Array<SignedMessage>>;
    mineTipset(numNewBlocks?: number): Promise<void>;
    hasLocal(cid: string): Promise<boolean>;
    private getIPFSObjectSize;
    private downloadFile;
    startDeal(proposal: StartDealParams): Promise<RootCID>;
    createQueryOffer(rootCid: RootCID): Promise<QueryOffer>;
    retrieve(retrievalOrder: RetrievalOrder, ref: FileRef): Promise<void>;
    getTipsetFromKey(tipsetKey?: Array<RootCID>): Promise<Tipset>;
    getTipsetByHeight(height: number, tipsetKey?: Array<RootCID>): Promise<Tipset>;
    createAccount(protocol: AddressProtocol): Promise<Account_3>;
    private logLatestTipset;
}

declare type BlockchainEvents = {
    ready: undefined;
    tipset: Tipset;
    minerEnabled: boolean;
    dealUpdate: DealInfo;
};

declare interface BlockchainInterface {
    consensus: Consensus;
    /**
     * Adds a block to the blockchain.
     *
     * @param block - The block to be added to the blockchain.
     */
    putBlock(block: Block_3): Promise<void>;
    /**
     * Deletes a block from the blockchain. All child blocks in the chain are
     * deleted and any encountered heads are set to the parent block.
     *
     * @param blockHash - The hash of the block to be deleted
     */
    delBlock(blockHash: Buffer): Promise<void>;
    /**
     * Returns a block by its hash or number.
     */
    getBlock(blockId: Buffer | number | bigint): Promise<Block_3 | null>;
    /**
     * Iterates through blocks starting at the specified iterator head and calls
     * the onBlock function on each block.
     *
     * @param name - Name of the state root head
     * @param onBlock - Function called on each block with params (block: Block,
     * @param maxBlocks - optional maximum number of blocks to iterate through
     * reorg: boolean)
     */
    iterator(name: string, onBlock: OnBlock, maxBlocks?: number, releaseLockOnCallback?: boolean): Promise<number>;
    /**
     * Returns a copy of the blockchain
     */
    copy(): BlockchainInterface;
    /**
     * Validates a block header, throwing if invalid. It is being validated against the reported `parentHash`.
     * @param header - header to be validated
     * @param height - If this is an uncle header, this is the height of the block that is including it
     */
    validateHeader(header: BlockHeader_2, height?: bigint): Promise<void>;
    /**
     * Returns the specified iterator head.
     *
     * @param name - Optional name of the iterator head (default: 'vm')
     */
    getIteratorHead?(name?: string): Promise<Block_3>;
    /**
     * Gets total difficulty for a block specified by hash and number
     */
    getTotalDifficulty?(hash: Buffer, number?: bigint): Promise<bigint>;
    /**
     * Returns the genesis state of the blockchain.
     * All values are provided as hex-prefixed strings.
     */
    genesisState?(): GenesisState;
    /**
     * Returns the latest full block in the canonical chain.
     */
    getCanonicalHeadBlock?(): Promise<Block_3>;
}

/**
 * This are the options that the Blockchain constructor can receive.
 */
declare interface BlockchainOptions {
    /**
     * Specify the chain and hardfork by passing a {@link Common} instance.
     *
     * If not provided this defaults to chain `mainnet` and hardfork `chainstart`
     *
     */
    common?: Common;
    /**
     * Set the HF to the fork determined by the head block and update on head updates.
     *
     * Note: for HFs where the transition is also determined by a total difficulty
     * threshold (merge HF) the calculated TD is additionally taken into account
     * for HF determination.
     *
     * Default: `false` (HF is set to whatever default HF is set by the {@link Common} instance)
     */
    hardforkByHeadBlockNumber?: boolean;
    /**
     * Database to store blocks and metadata.
     * Should be an `abstract-leveldown` compliant store
     * wrapped with `encoding-down`.
     * For example:
     *   `levelup(encode(leveldown('./db1')))`
     * or use the `level` convenience package:
     *   `new MemoryLevel('./db1')`
     */
    db?: AbstractLevel<string | Buffer | Uint8Array, string | Buffer, string | Buffer>;
    /**
     * This flags indicates if a block should be validated along the consensus algorithm
     * or protocol used by the chain, e.g. by verifying the PoW on the block.
     *
     * Supported consensus types and algorithms (taken from the `Common` instance):
     * - 'pow' with 'ethash' algorithm (validates the proof-of-work)
     * - 'poa' with 'clique' algorithm (verifies the block signatures)
     * Default: `true`.
     */
    validateConsensus?: boolean;
    /**
     * This flag indicates if protocol-given consistency checks on
     * block headers and included uncles and transactions should be performed,
     * see Block#validate for details.
     *
     */
    validateBlocks?: boolean;
    /**
     * The blockchain only initializes successfully if it has a genesis block. If
     * there is no block available in the DB and a `genesisBlock` is provided,
     * then the provided `genesisBlock` will be used as genesis. If no block is
     * present in the DB and no block is provided, then the genesis block as
     * provided from the `common` will be used.
     */
    genesisBlock?: Block_3;
    /**
     * If you are using a custom chain {@link Common}, pass the genesis state.
     *
     * Pattern 1 (with genesis state see {@link GenesisState} for format):
     *
     * ```javascript
     * {
     *   '0x0...01': '0x100', // For EoA
     * }
     * ```
     *
     * Pattern 2 (with complex genesis state, containing contract accounts and storage).
     * Note that in {@link AccountState} there are two
     * accepted types. This allows to easily insert accounts in the genesis state:
     *
     * A complex genesis state with Contract and EoA states would have the following format:
     *
     * ```javascript
     * {
     *   '0x0...01': '0x100', // For EoA
     *   '0x0...02': ['0x1', '0xRUNTIME_BYTECODE', [[storageKey1, storageValue1], [storageKey2, storageValue2]]] // For contracts
     * }
     * ```
     */
    genesisState?: GenesisState;
    /**
     * Optional custom consensus that implements the {@link Consensus} class
     */
    consensus?: Consensus;
}

declare type BlockchainTypedEvents = {
    block: Block;
    blockLogs: BlockLogs;
    pendingTransaction: TypedTransaction;
    "ganache:vm:tx:step": VmStepEvent;
    "ganache:vm:tx:before": VmBeforeTransactionEvent;
    "ganache:vm:tx:after": VmAfterTransactionEvent;
    "ganache:vm:tx:console.log": VmConsoleLogEvent;
    ready: undefined;
    stop: undefined;
};

/**
 * A block's data.
 */
declare interface BlockData {
    /**
     * Header data for the block
     */
    header?: HeaderData;
    transactions?: Array<TxData | AccessListEIP2930TxData | FeeMarketEIP1559TxData>;
    uncleHeaders?: Array<HeaderData>;
}

declare type BlockHashFilterArgs = BaseFilterArgs & {
    blockHash?: string;
};

declare type BlockHeader = {
    parentHash: Data;
    sha3Uncles: Data;
    miner: Data;
    stateRoot: Data;
    transactionsRoot: Data;
    receiptsRoot: Data;
    logsBloom: Data;
    difficulty: Quantity;
    totalDifficulty: Quantity;
    number: Quantity;
    gasLimit: Quantity;
    gasUsed: Quantity;
    timestamp: Quantity;
    extraData: Data;
    mixHash: Data;
    nonce: Data;
    baseFeePerGas?: Quantity;
};

/**
 * An object that represents the block header.
 */
declare class BlockHeader_2 {
    readonly parentHash: Buffer;
    readonly uncleHash: Buffer;
    readonly coinbase: Address_2;
    readonly stateRoot: Buffer;
    readonly transactionsTrie: Buffer;
    readonly receiptTrie: Buffer;
    readonly logsBloom: Buffer;
    readonly difficulty: bigint;
    readonly number: bigint;
    readonly gasLimit: bigint;
    readonly gasUsed: bigint;
    readonly timestamp: bigint;
    readonly extraData: Buffer;
    readonly mixHash: Buffer;
    readonly nonce: Buffer;
    readonly baseFeePerGas?: bigint;
    readonly _common: Common;
    private cache;
    /**
     * EIP-4399: After merge to PoS, `mixHash` supplanted as `prevRandao`
     */
    get prevRandao(): Buffer;
    /**
     * Static constructor to create a block header from a header data dictionary
     *
     * @param headerData
     * @param opts
     */
    static fromHeaderData(headerData?: HeaderData, opts?: BlockOptions): BlockHeader_2;
    /**
     * Static constructor to create a block header from a RLP-serialized header
     *
     * @param serializedHeaderData
     * @param opts
     */
    static fromRLPSerializedHeader(serializedHeaderData: Buffer, opts?: BlockOptions): BlockHeader_2;
    /**
     * Static constructor to create a block header from an array of Buffer values
     *
     * @param values
     * @param opts
     */
    static fromValuesArray(values: BlockHeaderBuffer, opts?: BlockOptions): BlockHeader_2;
    /**
     * This constructor takes the values, validates them, assigns them and freezes the object.
     *
     * @deprecated Use the public static factory methods to assist in creating a Header object from
     * varying data types. For a default empty header, use {@link BlockHeader.fromHeaderData}.
     *
     */
    constructor(headerData: HeaderData, options?: BlockOptions);
    /**
     * Validates correct buffer lengths, throws if invalid.
     */
    _genericFormatValidation(): void;
    /**
     * Checks static parameters related to consensus algorithm
     * @throws if any check fails
     */
    _consensusFormatValidation(): void;
    /**
     * Validates if the block gasLimit remains in the boundaries set by the protocol.
     * Throws if out of bounds.
     *
     * @param parentBlockHeader - the header from the parent `Block` of this header
     */
    validateGasLimit(parentBlockHeader: BlockHeader_2): void;
    /**
     * Calculates the base fee for a potential next block
     */
    calcNextBaseFee(): bigint;
    /**
     * Returns a Buffer Array of the raw Buffers in this header, in order.
     */
    raw(): BlockHeaderBuffer;
    /**
     * Returns the hash of the block header.
     */
    hash(): Buffer;
    /**
     * Checks if the block header is a genesis header.
     */
    isGenesis(): boolean;
    private _requireClique;
    /**
     * Returns the canonical difficulty for this block.
     *
     * @param parentBlockHeader - the header from the parent `Block` of this header
     */
    ethashCanonicalDifficulty(parentBlockHeader: BlockHeader_2): bigint;
    /**
     * PoA clique signature hash without the seal.
     */
    cliqueSigHash(): Buffer;
    /**
     * Checks if the block header is an epoch transition
     * header (only clique PoA, throws otherwise)
     */
    cliqueIsEpochTransition(): boolean;
    /**
     * Returns extra vanity data
     * (only clique PoA, throws otherwise)
     */
    cliqueExtraVanity(): Buffer;
    /**
     * Returns extra seal data
     * (only clique PoA, throws otherwise)
     */
    cliqueExtraSeal(): Buffer;
    /**
     * Seal block with the provided signer.
     * Returns the final extraData field to be assigned to `this.extraData`.
     * @hidden
     */
    private cliqueSealBlock;
    /**
     * Returns a list of signers
     * (only clique PoA, throws otherwise)
     *
     * This function throws if not called on an epoch
     * transition block and should therefore be used
     * in conjunction with {@link BlockHeader.cliqueIsEpochTransition}
     */
    cliqueEpochTransitionSigners(): Address_2[];
    /**
     * Verifies the signature of the block (last 65 bytes of extraData field)
     * (only clique PoA, throws otherwise)
     *
     *  Method throws if signature is invalid
     */
    cliqueVerifySignature(signerList: Address_2[]): boolean;
    /**
     * Returns the signer address
     */
    cliqueSigner(): Address_2;
    /**
     * Returns the rlp encoding of the block header.
     */
    serialize(): Buffer;
    /**
     * Returns the block header in JSON format.
     */
    toJSON(): JsonHeader;
    /**
     * Validates extra data is DAO_ExtraData for DAO_ForceExtraDataRange blocks after DAO
     * activation block (see: https://blog.slock.it/hard-fork-specification-24b889e70703)
     */
    private _validateDAOExtraData;
    /**
     * Return a compact error string representation of the object
     */
    errorStr(): string;
    /**
     * Helper function to create an annotated error message
     *
     * @param msg Base error message
     * @hidden
     */
    protected _errorMsg(msg: string): string;
}

declare class BlockHeader_3 extends SerializableObject<BlockHeaderConfig> implements DeserializedObject<BlockHeaderConfig> {
    get config(): Definitions<BlockHeaderConfig>;
    constructor(options?: Partial<SerializedObject<BlockHeaderConfig>> | Partial<DeserializedObject<BlockHeaderConfig>>);
    miner: Address_3;
    ticket: Ticket;
    electionProof: ElectionProof;
    beaconEntries: Array<BeaconEntry>;
    winPoStProof: Array<PoStProof>;
    parents: Array<RootCID>;
    parentWeight: bigint;
    height: number;
    parentStateRoot: RootCID;
    parentMessageReceipts: RootCID;
    messages: RootCID;
    blsAggregate: Signature;
    /**
     * Timestamp in seconds. Reference implementation: https://git.io/Jt3HJ.
     */
    timestamp: number;
    blockSignature: Signature;
    forkSignaling: 0 | 1;
    parentBaseFee: bigint;
}

declare type BlockHeaderBuffer = Buffer[];

declare interface BlockHeaderConfig {
    properties: {
        miner: {
            type: Address_3;
            serializedType: SerializedAddress;
            serializedName: "Miner";
        };
        ticket: {
            type: Ticket;
            serializedType: SerializedTicket;
            serializedName: "Ticket";
        };
        electionProof: {
            type: ElectionProof;
            serializedType: SerializedElectionProof;
            serializedName: "ElectionProof";
        };
        beaconEntries: {
            type: Array<BeaconEntry>;
            serializedType: Array<SerializedBeaconEntry>;
            serializedName: "BeaconEntries";
        };
        winPoStProof: {
            type: Array<PoStProof>;
            serializedType: Array<SerializedPoStProof>;
            serializedName: "WinPoStProof";
        };
        parents: {
            type: Array<RootCID>;
            serializedType: Array<SerializedRootCID>;
            serializedName: "Parents";
        };
        parentWeight: {
            type: bigint;
            serializedType: string;
            serializedName: "ParentWeight";
        };
        height: {
            type: number;
            serializedType: number;
            serializedName: "Height";
        };
        parentStateRoot: {
            type: RootCID;
            serializedType: SerializedRootCID;
            serializedName: "ParentStateRoot";
        };
        parentMessageReceipts: {
            type: RootCID;
            serializedType: SerializedRootCID;
            serializedName: "ParentMessageReceipts";
        };
        messages: {
            type: RootCID;
            serializedType: SerializedRootCID;
            serializedName: "Messages";
        };
        blsAggregate: {
            type: Signature;
            serializedType: SerializedSignature;
            serializedName: "BLSAggregate";
        };
        timestamp: {
            type: number;
            serializedType: number;
            serializedName: "Timestamp";
        };
        blockSignature: {
            type: Signature;
            serializedType: SerializedSignature;
            serializedName: "BlockSig";
        };
        forkSignaling: {
            type: 0 | 1;
            serializedType: 0 | 1;
            serializedName: "ForkSignaling";
        };
        parentBaseFee: {
            type: bigint;
            serializedType: string;
            serializedName: "ParentBaseFee";
        };
    };
}

declare class BlockHeaderManager extends Manager_2<BlockHeader_3, BlockHeaderConfig> {
    static initialize(base: LevelUp): Promise<BlockHeaderManager>;
    constructor(base: LevelUp);
    /**
     * Writes the blockHeader object to the underlying database.
     * @param blockHeader -
     */
    putBlockHeader(blockHeader: BlockHeader_3): Promise<void>;
}

declare type BlockLog = [
removed: Buffer,
transactionIndex: Buffer,
transactionHash: Buffer,
address: TransactionLog[0],
topics: TransactionLog[1],
data: TransactionLog[2]
];

declare class BlockLogManager extends Manager<BlockLogs> {
    #private;
    constructor(base: GanacheLevelUp, blockchain: Blockchain);
    get(key: string | Buffer): Promise<BlockLogs>;
    getLogs(filter: FilterArgs): Promise<Ethereum.Logs>;
}

declare class BlockLogs {
    [_raw]: [blockHash: Buffer, blockLog: BlockLog[]];
    constructor(data: Buffer);
    /**
     *
     * @param blockHash - Creates an BlogLogs entity with an empty internal logs
     * array.
     */
    static create(blockHash: Data): BlockLogs;
    /**
     * rlpEncode's the blockHash and logs array for db storage
     */
    serialize(): Buffer;
    /**
     * Appends the data to the internal logs array
     * @param transactionIndex -
     * @param transactionHash -
     * @param log -
     */
    append(transactionIndex: Quantity, transactionHash: Data, log: TransactionLog): void;
    /**
     * Returns the number of logs in the internal logs array.
     */
    get length(): number;
    blockNumber: Quantity;
    static fromJSON(json: any[] | null): BlockLogs;
    toJSON(): {
        [Symbol.iterator](): Generator<Log_2, void, unknown>;
    };
    [_logs](): {
        toJSON(): {
            [Symbol.iterator](): Generator<Log_2, void, unknown>;
        };
        [Symbol.iterator](): Generator<{
            address: Buffer;
            topics: Buffer[];
            toJSON: () => Log_2;
        }, void, unknown>;
    };
    /**
     *
     * @param log -
     * @param logIndex - The index this log appears in the block
     * @param blockHash - The hash of the block
     * @param blockNumber - The block number
     */
    protected static logToJSON(log: BlockLog, logIndex: Quantity, blockHash: Data, blockNumber: Quantity): Log_2;
    /**
     * Note: you must set `this.blockNumber: Quantity` first!
     *
     * Topics are order-dependent. A transaction with a log with topics [A, B] will be matched by the following topic
     * filters:
     *  ▸ [] "anything"
     *  ▸ [A] "A in first position (and anything after)"
     *  ▸ [null, B] "anything in first position AND B in second position (and anything after)"
     *  ▸ [A, B] "A" in first position AND B in second position (and anything after)"
     *  ▸ [[A, B], [A, B]] "(A OR B) in first position AND (A OR B) in second position (and anything after)"
     * @param expectedAddresses -
     * @param expectedTopics -
     * @returns JSON representation of the filtered logs
     */
    filter(expectedAddresses: Buffer[], expectedTopics: (string | string[])[]): Generator<Log_2, void, unknown>;
}

declare class BlockManager extends Manager<Block> {
    #private;
    /**
     * The earliest block
     */
    earliest: Block;
    /**
     * The latest block
     */
    latest: Block;
    /**
     * The next block
     */
    pending: Block;
    static initialize(blockchain: Blockchain, common: Common, blockIndexes: GanacheLevelUp, base: GanacheLevelUp): Promise<BlockManager>;
    constructor(blockchain: Blockchain, common: Common, blockIndexes: GanacheLevelUp, base: GanacheLevelUp);
    static rawFromJSON(json: any, common: Common): Buffer;
    fromFallback: (tagOrBlockNumber: string | Quantity) => Promise<Buffer>;
    getBlockByTag(tag: Tag): Block;
    getEffectiveNumber(tagOrBlockNumber?: QUANTITY | Buffer | Tag): Quantity;
    getNumberFromHash(hash: string | Buffer | Tag): Promise<Buffer>;
    getByHash(hash: string | Buffer | Tag): Promise<Block>;
    getRawByBlockNumber(blockNumber: Quantity): Promise<Buffer>;
    get(tagOrBlockNumber: QUANTITY | Buffer | Tag): Promise<Block>;
    /**
     * Writes the block object to the underlying database.
     * @param block -
     */
    putBlock(number: Buffer, hash: Data, serialized: Buffer): Promise<void>;
    /**
     * Updates the "latest" index to point to the given number.
     * @param number the block number of the latest block
     */
    updateLatestIndex(number: Buffer): Promise<void>;
    /**
     * Updates the this.latest and this.earliest properties with data
     * from the database.
     */
    updateTaggedBlocks(): Promise<void>;
}

declare class BlockMessages extends SerializableObject<BlockMessagesConfig> implements DeserializedObject<BlockMessagesConfig> {
    get config(): Definitions<BlockMessagesConfig>;
    constructor(options?: Partial<SerializedObject<BlockMessagesConfig>> | Partial<DeserializedObject<BlockMessagesConfig>>);
    /**
     * The messages in the block that were signed with BLS.
     * In Ganache, this should always contain all of the
     * messages due to always signing new blocks with BLS.
     */
    blsMessages: Array<Message_2>;
    /**
     * The messages in the block that were signed with Secpk.
     * In Ganache, this should always be empty due to always
     * signing new blocks with BLS.
     */
    secpkMessages: Array<SignedMessage>;
    cids: Array<RootCID>;
    initializeCids(): void;
    static fromSignedMessages(signedMessages: Array<SignedMessage>): BlockMessages;
}

declare type BlockMessagesConfig = {
    properties: {
        blsMessages: {
            type: Array<Message_2>;
            serializedType: Array<SerializedMessage>;
            serializedName: "BlsMessages";
        };
        secpkMessages: {
            type: Array<SignedMessage>;
            serializedType: Array<SerializedSignedMessage>;
            serializedName: "SecpkMessages";
        };
        cids: {
            type: Array<RootCID>;
            serializedType: Array<SerializedRootCID>;
            serializedName: "Cids";
        };
    };
};

declare class BlockMessagesManager extends Manager_2<BlockMessages, BlockMessagesConfig> {
    #private;
    static initialize(base: LevelUp, signedMessageManager: SignedMessageManager): Promise<BlockMessagesManager>;
    constructor(base: LevelUp, signedMessageManager: SignedMessageManager);
    putBlockMessages(blockCID: CID, messages: BlockMessages): Promise<void>;
    getBlockMessages(blockCID: CID): Promise<BlockMessages>;
}

/**
 * An object to set to which blockchain the blocks and their headers belong. This could be specified
 * using a {@link Common} object, or `chain` and `hardfork`. Defaults to mainnet without specifying a
 * hardfork.
 */
declare interface BlockOptions {
    /**
     * A {@link Common} object defining the chain and the hardfork a block/block header belongs to.
     *
     * Object will be internally copied so that tx behavior don't incidentally
     * change on future HF changes.
     *
     * Default: {@link Common} object set to `mainnet` and the HF currently defined as the default
     * hardfork in the {@link Common} class.
     *
     * Current default hardfork: `merge`
     */
    common?: Common;
    /**
     * Determine the HF by the block number
     *
     * Default: `false` (HF is set to whatever default HF is set by the {@link Common} instance)
     */
    hardforkByBlockNumber?: boolean;
    /**
     * Determine the HF by total difficulty (Merge HF)
     *
     * This option is a superset of `hardforkByBlockNumber` (so only use one of both options)
     * and determines the HF by both the block number and the TD.
     *
     * Since the TTD is only a threshold the block number will in doubt take precedence (imagine
     * e.g. both Merge and Shanghai HF blocks set and the block number from the block provided
     * pointing to a Shanghai block: this will lead to set the HF as Shanghai and not the Merge).
     */
    hardforkByTTD?: BigIntLike;
    /**
     * If a preceding {@link BlockHeader} (usually the parent header) is given the preceding
     * header will be used to calculate the difficulty for this block and the calculated
     * difficulty takes precedence over a provided static `difficulty` value.
     *
     * Note that this option has no effect on networks other than PoW/Ethash networks
     * (respectively also deactivates on the Merge HF switching to PoS/Casper).
     */
    calcDifficultyFromHeader?: BlockHeader_2;
    /**
     * A block object by default gets frozen along initialization. This gives you
     * strong additional security guarantees on the consistency of the block parameters.
     * It also enables block hash caching when the `hash()` method is called multiple times.
     *
     * If you need to deactivate the block freeze - e.g. because you want to subclass block and
     * add aditional properties - it is strongly encouraged that you do the freeze yourself
     * within your code instead.
     *
     * Default: true
     */
    freeze?: boolean;
    /**
     * Provide a clique signer's privateKey to seal this block.
     * Will throw if provided on a non-PoA chain.
     */
    cliqueSigner?: Buffer;
    /**
     *  Skip consensus format validation checks on header if set. Defaults to false.
     */
    skipConsensusFormatValidation?: boolean;
}

declare class Bloom {
    bitvector: Buffer;
    /**
     * Represents a Bloom filter.
     */
    constructor(bitvector?: Buffer);
    /**
     * Adds an element to a bit vector of a 64 byte bloom filter.
     * @param e - The element to add
     */
    add(e: Buffer): void;
    /**
     * Checks if an element is in the bloom.
     * @param e - The element to check
     */
    check(e: Buffer): boolean;
    /**
     * Checks if multiple topics are in a bloom.
     * @returns `true` if every topic is in the bloom
     */
    multiCheck(topics: Buffer[]): boolean;
    /**
     * Bitwise or blooms together.
     */
    or(bloom: Bloom): void;
}

declare interface BootstrapNodeConfig {
    ip: string;
    port: number | string;
    network?: string;
    chainId?: number;
    id: string;
    location: string;
    comment: string;
}

declare class BranchNode {
    _branches: (EmbeddedNode | null)[];
    _value: Buffer | null;
    constructor();
    static fromArray(arr: Buffer[]): BranchNode;
    value(v?: Buffer | null): Buffer | null;
    setBranch(i: number, v: EmbeddedNode | null): void;
    raw(): (EmbeddedNode | null)[];
    serialize(): Buffer;
    getBranch(i: number): EmbeddedNode | null;
    getChildren(): [number, EmbeddedNode][];
}

declare type BufferLike = Buffer | Uint8Array | number[] | number | bigint | TransformableToBuffer | PrefixedHexString;

/**
 * Options for building a block.
 */
declare interface BuildBlockOpts {
    /**
     * The parent block
     */
    parentBlock: Block_3;
    /**
     * The block header data to use.
     * Defaults used for any values not provided.
     */
    headerData?: HeaderData;
    /**
     * The block and builder options to use.
     */
    blockOpts?: BuilderOpts;
}

/**
 * Options for the block builder.
 */
declare interface BuilderOpts extends BlockOptions {
    /**
     * Whether to put the block into the vm's blockchain after building it.
     * This is useful for completing a full cycle when building a block so
     * the only next step is to build again, however it may not be desired
     * if the block is being emulated or may be discarded as to not affect
     * the underlying blockchain.
     *
     * Default: true
     */
    putBlockIntoBlockchain?: boolean;
}

/**
 * Simple LRU Cache that allows for keys of type Buffer
 * @hidden
 */
declare class Cache<V> {
    _cache: LRUCache<string, V>;
    constructor(opts: LRUCache.Options<string, V>);
    set(key: string | Buffer, value: V): void;
    get(key: string | Buffer): V | undefined;
    del(key: string | Buffer): void;
}

declare type CacheMap = {
    [key: string]: Cache<Buffer>;
};

/**
 * Compute the 'intrinsic gas' for a message with the given data.
 * @param data - The transaction's data
 * @param hasToAddress - boolean,
 * @param common - The Common use to determine gas costs
 * @returns The absolute minimum amount of gas this transaction will consume,
 * or `-1` if the data in invalid (gas consumption would exceed `MAX_UINT64`
 * (`(2n ** 64n) - 1n`).
 */
declare const calculateIntrinsicGas: (data: Data, hasToAddress: boolean, common: Common) => bigint;

declare interface Callback {
    (err?: Error, response?: JsonRpcResponse | JsonRpcError): void;
}

declare type Callback_2 = (err: Error | null) => void;

declare class CallError extends CodedError {
    code: JsonRpcErrorCode;
    data: string;
    constructor(result: EVMResult);
}

declare type CallOverride = Partial<{
    code: string;
    nonce: string;
    balance: string;
    state: {
        [slot: string]: string;
    };
    stateDiff: never;
}> | Partial<{
    code: string;
    nonce: string;
    balance: string;
    state: never;
    stateDiff: {
        [slot: string]: string;
    };
}>;

declare type CallOverrides = {
    [address: string]: CallOverride;
};

declare type CallTransaction = Omit<Transaction, "from"> & {
    from?: string;
};

declare type Capability = 2718 | 2930 | 1559;

/**
 * Can be used in conjunction with {@link Transaction.supports}
 * to query on tx capabilities
 */
declare enum Capability_2 {
    /**
     * Tx supports EIP-155 replay protection
     * See: [155](https://eips.ethereum.org/EIPS/eip-155) Replay Attack Protection EIP
     */
    EIP155ReplayProtection = 155,
    /**
     * Tx supports EIP-1559 gas fee market mechanism
     * See: [1559](https://eips.ethereum.org/EIPS/eip-1559) Fee Market EIP
     */
    EIP1559FeeMarket = 1559,
    /**
     * Tx is a typed transaction as defined in EIP-2718
     * See: [2718](https://eips.ethereum.org/EIPS/eip-2718) Transaction Type EIP
     */
    EIP2718TypedTransaction = 2718,
    /**
     * Tx supports access list generation as defined in EIP-2930
     * See: [2930](https://eips.ethereum.org/EIPS/eip-2930) Access Lists EIP
     */
    EIP2930AccessLists = 2930
}

/**
 * How many transactions should be in the block.
 */
declare enum Capacity {
    /**
     * Keep mining transactions until there are no more transactions that can fit
     * in the block, or there are no transactions left to mine.
     */
    FillBlock = -1,
    /**
     * Mine an empty block, even if there are executable transactions available to
     * mine.
     */
    Empty = 0,
    /**
     * Mine a block with a single transaction, or empty if there are no executable
     * transactions available to mine.
     */
    Single = 1
}

declare type CasperConfig = {};

declare enum Chain {
    Mainnet = 1,
    Ropsten = 3,
    Rinkeby = 4,
    Goerli = 5,
    Sepolia = 11155111
}

declare type ChainConfig = {
    options: {
        /**
         * Allows unlimited contract sizes while debugging. By setting this to
         * `true`, the check within the EVM for a contract size limit of 24KB (see
         * [EIP-170](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-170.md))
         * is bypassed. Setting this to `true` will cause ganache to behave
         * differently than production environments. You should only set this to
         * `true` during local debugging.
         *
         * @defaultValue false
         */
        readonly allowUnlimitedContractSize: {
            type: boolean;
            hasDefault: true;
            legacy: {
                /**
                 * @deprecated Use chain.allowUnlimitedContractSize instead
                 */
                allowUnlimitedContractSize: boolean;
            };
        };
        /**
         * When set to `false` only one request will be processed at a time.
         *
         * @defaultValue true
         */
        readonly asyncRequestProcessing: {
            type: boolean;
            hasDefault: true;
            legacy: {
                /**
                 * @deprecated Use chain.asyncRequestProcessing instead
                 */
                asyncRequestProcessing: boolean;
            };
        };
        /**
         * The currently configured chain id, a value used in replay-protected
         * transaction signing as introduced by
         * [EIP-155](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md).
         *
         * @defaultValue 1337
         */
        readonly chainId: {
            type: number;
            hasDefault: true;
            legacy: {
                /**
                 * @deprecated Use chain.chainId instead
                 */
                chainId: number;
            };
        };
        /**
         * The id of the network returned by the RPC method `net_version`.
         *
         * Defaults to the current timestamp, via JavaScript's `Date.now()` (the
         * number of milliseconds since the UNIX epoch).
         *
         * @defaultValue Date.now()
         */
        readonly networkId: {
            type: number;
            hasDefault: true;
            legacy: {
                /**
                 * @deprecated Use chain.networkId instead
                 */
                network_id: number;
            };
        };
        /**
         * Date that the first block should start. Use this feature, along with the
         * `evm_increaseTime` RPC, to test time-dependent code.
         */
        readonly time: {
            type: Date | null;
            rawType: Date | string | number;
            legacy: {
                /**
                 * @deprecated Use chain.time instead
                 */
                time: Date | string;
            };
            cliType: string;
        };
        /**
         * Set the hardfork rules for the EVM.
         * @defaultValue "merge"
         */
        readonly hardfork: {
            type: Hardfork;
            hasDefault: true;
            legacy: {
                /**
                 * @deprecated Use chain.hardfork instead
                 */
                hardfork: Hardfork;
            };
        };
        /**
         * Whether to report runtime errors from EVM code as RPC errors.
         *
         * @defaultValue false
         */
        readonly vmErrorsOnRPCResponse: {
            type: boolean;
            hasDefault: true;
            legacy: {
                /**
                 * @deprecated Use chain.vmErrorsOnRPCResponse instead
                 */
                vmErrorsOnRPCResponse: boolean;
            };
        };
    };
};

declare interface ChainConfig_2 {
    name: string;
    chainId: number | bigint;
    networkId: number | bigint;
    defaultHardfork: string;
    comment: string;
    url: string;
    genesis: GenesisBlockConfig;
    hardforks: HardforkConfig[];
    bootstrapNodes: BootstrapNodeConfig[];
    dnsNetworks?: string[];
    consensus: {
        type: ConsensusType | string;
        algorithm: ConsensusAlgorithm | string;
        clique?: CliqueConfig;
        ethash?: EthashConfig;
        casper?: CasperConfig;
    };
}

declare type ChainConfig_3 = {
    options: {
        /**
         * The IPFS simulator host name/address to listen on.
         *
         * @defaultValue "127.0.0.1"
         */
        readonly ipfsHost: {
            type: string;
            hasDefault: true;
        };
        /**
         * The IPFS simulator port.
         *
         * @defaultValue 5001
         */
        readonly ipfsPort: {
            type: number;
            hasDefault: true;
        };
        /**
         * When set to `false` only one request will be processed at a time.
         *
         * @defaultValue true
         */
        readonly asyncRequestProcessing: {
            type: boolean;
            hasDefault: true;
        };
    };
};

declare interface ChainName {
    [chainId: string]: string;
}

declare interface ChainsConfig {
    [key: string]: ChainConfig_2 | ChainName;
}

declare const ChannelClosed: "xrpc.ch.close";

declare class ChannelID extends SerializableObject<ChannelIDConfig> implements DeserializedObject<ChannelIDConfig> {
    get config(): Definitions<ChannelIDConfig>;
    constructor(options?: Partial<SerializedObject<ChannelIDConfig>> | Partial<DeserializedObject<ChannelIDConfig>>);
    initiator: string;
    responder: string;
    id: number;
}

declare type ChannelIDConfig = {
    properties: {
        initiator: {
            type: string;
            serializedType: string;
            serializedName: "Initiator";
        };
        responder: {
            type: string;
            serializedType: string;
            serializedName: "Responder";
        };
        id: {
            type: number;
            serializedType: number;
            serializedName: "ID";
        };
    };
};

declare type Checkpoint = {
    keyValueMap: Map<string, Buffer | null>;
    root: Buffer;
};

/**
 * DB is a thin wrapper around the underlying levelup db,
 * which validates inputs and sets encoding type.
 */
declare class CheckpointDB implements DB {
    checkpoints: Checkpoint[];
    db: DB;
    /**
     * Initialize a DB instance.
     */
    constructor(db: DB);
    /**
     * Flush the checkpoints and use the given checkpoints instead.
     * @param {Checkpoint[]} checkpoints
     */
    setCheckpoints(checkpoints: Checkpoint[]): void;
    /**
     * Is the DB during a checkpoint phase?
     */
    hasCheckpoints(): boolean;
    /**
     * Adds a new checkpoint to the stack
     * @param root
     */
    checkpoint(root: Buffer): void;
    /**
     * Commits the latest checkpoint
     */
    commit(): Promise<void>;
    /**
     * Reverts the latest checkpoint
     */
    revert(): Promise<Buffer>;
    /**
     * @inheritDoc
     */
    get(key: Buffer): Promise<Buffer | null>;
    /**
     * @inheritDoc
     */
    put(key: Buffer, val: Buffer): Promise<void>;
    /**
     * @inheritDoc
     */
    del(key: Buffer): Promise<void>;
    /**
     * @inheritDoc
     */
    batch(opStack: BatchDBOp[]): Promise<void>;
    /**
     * @inheritDoc
     */
    copy(): CheckpointDB;
}

declare class CID extends SerializableLiteral<CIDConfig> {
    get config(): {};
    static isValid(value: string): boolean;
    static nullCID(): CID;
}

declare interface CIDConfig {
    type: string;
}

declare type CliqueConfig = {
    period: number;
    epoch: number;
};

declare type CliTypes = PrimitiveCliTypes | PrimitiveCliTypes[] | string[] | number[] | boolean[];

declare class CodedError extends Error {
    code: number;
    constructor(message: string, code: number);
    static from(error: Error, code: JsonRpcErrorCode): CodedError;
    static nonEnumerableProperty(value: any): {
        value: any;
        writable: boolean;
        configurable: boolean;
    };
    static captureStackTraceExtended(message: string): void;
    static createRevertReason(returnValue: Buffer): string;
}

declare type Combine<C extends Base.Config, O extends unknown, GRP extends ExclusiveGroup<C>, T extends "rawType" | "type"> = {
    [N in keyof GRP]: GRP[N] extends OptionName<C> ? {
        [Key in keyof (ExclusiveGroupOptionalUnionByName<C, GRP, GRP[N], T> & UnconstrainedOptionsByType<C, T> & O)]: Key extends keyof ExclusiveGroupOptionalUnionByName<C, GRP, GRP[N], T> ? ExclusiveGroupOptionalUnionByName<C, GRP, GRP[N], T>[Key] : Key extends keyof UnconstrainedOptionsByType<C, T> ? UnconstrainedOptionsByType<C, T>[Key] : Key extends keyof O ? O[Key] : never;
    } : never;
} extends {
    [n: number]: infer I;
} ? I : never;

/**
 * Common class to access chain and hardfork parameters and to provide
 * a unified and shared view on the network and hardfork state.
 *
 * Use the {@link Common.custom} static constructor for creating simple
 * custom chain {@link Common} objects (more complete custom chain setups
 * can be created via the main constructor and the {@link CommonOpts.customChains} parameter).
 */
declare class Common extends EventEmitter {
    readonly DEFAULT_HARDFORK: string | Hardfork_2;
    private _chainParams;
    private _hardfork;
    private _eips;
    private _customChains;
    private HARDFORK_CHANGES;
    /**
     * Creates a {@link Common} object for a custom chain, based on a standard one.
     *
     * It uses all the {@link Chain} parameters from the {@link baseChain} option except the ones overridden
     * in a provided {@link chainParamsOrName} dictionary. Some usage example:
     *
     * ```javascript
     * Common.custom({chainId: 123})
     * ```
     *
     * There are also selected supported custom chains which can be initialized by using one of the
     * {@link CustomChains} for {@link chainParamsOrName}, e.g.:
     *
     * ```javascript
     * Common.custom(CustomChains.MaticMumbai)
     * ```
     *
     * Note that these supported custom chains only provide some base parameters (usually the chain and
     * network ID and a name) and can only be used for selected use cases (e.g. sending a tx with
     * the `@ethereumjs/tx` library to a Layer-2 chain).
     *
     * @param chainParamsOrName Custom parameter dict (`name` will default to `custom-chain`) or string with name of a supported custom chain
     * @param opts Custom chain options to set the {@link CustomCommonOpts.baseChain}, selected {@link CustomCommonOpts.hardfork} and others
     */
    static custom(chainParamsOrName: Partial<ChainConfig_2> | CustomChain, opts?: CustomCommonOpts): Common;
    /**
     * Static method to load and set common from a geth genesis json
     * @param genesisJson json of geth configuration
     * @param { chain, genesisHash, hardfork } to futher configure the common instance
         * @returns Common
         */
     static fromGethGenesis(genesisJson: any, { chain, genesisHash, hardfork }: GethConfigOpts): Common;
     /**
      * Static method to determine if a {@link chainId} is supported as a standard chain
      * @param chainId bigint id (`1`) of a standard chain
      * @returns boolean
      */
     static isSupportedChainId(chainId: bigint): boolean;
     private static _getChainParams;
     constructor(opts: CommonOpts);
     /**
      * Sets the chain
      * @param chain String ('mainnet') or Number (1) chain representation.
      *              Or, a Dictionary of chain parameters for a private network.
      * @returns The dictionary with parameters set as chain
      */
     setChain(chain: string | number | Chain | bigint | object): ChainConfig_2;
     /**
      * Sets the hardfork to get params for
      * @param hardfork String identifier (e.g. 'byzantium') or {@link Hardfork} enum
      */
     setHardfork(hardfork: string | Hardfork_2): void;
     /**
      * Returns the hardfork based on the block number or an optional
      * total difficulty (Merge HF) provided.
      *
      * An optional TD takes precedence in case the corresponding HF block
      * is set to `null` or otherwise needs to match (if not an error
      * will be thrown).
      *
      * @param blockNumber
      * @param td : total difficulty of the parent block (for block hf) OR of the the chain latest (for chain hf)
      * @returns The name of the HF
      */
     getHardforkByBlockNumber(blockNumber: BigIntLike, td?: BigIntLike): string;
     /**
      * Sets a new hardfork based on the block number or an optional
      * total difficulty (Merge HF) provided.
      *
      * An optional TD takes precedence in case the corresponding HF block
      * is set to `null` or otherwise needs to match (if not an error
      * will be thrown).
      *
      * @param blockNumber
      * @param td
      * @returns The name of the HF set
      */
     setHardforkByBlockNumber(blockNumber: BigIntLike, td?: BigIntLike): string;
     /**
      * Internal helper function, returns the params for the given hardfork for the chain set
      * @param hardfork Hardfork name
      * @returns Dictionary with hardfork params or null if hardfork not on chain
      */
     _getHardfork(hardfork: string | Hardfork_2): HardforkConfig | null;
     /**
      * Sets the active EIPs
      * @param eips
      */
     setEIPs(eips?: number[]): void;
     /**
      * Returns a parameter for the current chain setup
      *
      * If the parameter is present in an EIP, the EIP always takes precendence.
      * Otherwise the parameter if taken from the latest applied HF with
      * a change on the respective parameter.
      *
      * @param topic Parameter topic ('gasConfig', 'gasPrices', 'vm', 'pow')
      * @param name Parameter name (e.g. 'minGasLimit' for 'gasConfig' topic)
      * @returns The value requested or `BigInt(0)` if not found
      */
     param(topic: string, name: string): bigint;
     /**
      * Returns the parameter corresponding to a hardfork
      * @param topic Parameter topic ('gasConfig', 'gasPrices', 'vm', 'pow')
      * @param name Parameter name (e.g. 'minGasLimit' for 'gasConfig' topic)
      * @param hardfork Hardfork name
      * @returns The value requested or `BigInt(0)` if not found
      */
     paramByHardfork(topic: string, name: string, hardfork: string | Hardfork_2): bigint;
     /**
      * Returns a parameter corresponding to an EIP
      * @param topic Parameter topic ('gasConfig', 'gasPrices', 'vm', 'pow')
      * @param name Parameter name (e.g. 'minGasLimit' for 'gasConfig' topic)
      * @param eip Number of the EIP
      * @returns The value requested or `undefined` if not found
      */
     paramByEIP(topic: string, name: string, eip: number): bigint | undefined;
     /**
      * Returns a parameter for the hardfork active on block number or
      * optional provided total difficulty (Merge HF)
      * @param topic Parameter topic
      * @param name Parameter name
      * @param blockNumber Block number
      * @param td Total difficulty
      *    * @returns The value requested or `BigInt(0)` if not found
      */
     paramByBlock(topic: string, name: string, blockNumber: BigIntLike, td?: BigIntLike): bigint;
     /**
      * Checks if an EIP is activated by either being included in the EIPs
      * manually passed in with the {@link CommonOpts.eips} or in a
      * hardfork currently being active
      *
      * Note: this method only works for EIPs being supported
      * by the {@link CommonOpts.eips} constructor option
      * @param eip
      */
     isActivatedEIP(eip: number): boolean;
     /**
      * Checks if set or provided hardfork is active on block number
      * @param hardfork Hardfork name or null (for HF set)
      * @param blockNumber
      * @returns True if HF is active on block number
      */
     hardforkIsActiveOnBlock(hardfork: string | Hardfork_2 | null, blockNumber: BigIntLike): boolean;
     /**
      * Alias to hardforkIsActiveOnBlock when hardfork is set
      * @param blockNumber
      * @returns True if HF is active on block number
      */
     activeOnBlock(blockNumber: BigIntLike): boolean;
     /**
      * Sequence based check if given or set HF1 is greater than or equal HF2
      * @param hardfork1 Hardfork name or null (if set)
      * @param hardfork2 Hardfork name
      * @param opts Hardfork options
      * @returns True if HF1 gte HF2
      */
     hardforkGteHardfork(hardfork1: string | Hardfork_2 | null, hardfork2: string | Hardfork_2): boolean;
     /**
      * Alias to hardforkGteHardfork when hardfork is set
      * @param hardfork Hardfork name
      * @returns True if hardfork set is greater than hardfork provided
      */
     gteHardfork(hardfork: string | Hardfork_2): boolean;
     /**
      * Returns the hardfork change block for hardfork provided or set
      * @param hardfork Hardfork name, optional if HF set
      * @returns Block number or null if unscheduled
      */
     hardforkBlock(hardfork?: string | Hardfork_2): bigint | null;
     /**
      * Returns the hardfork change block for eip
      * @param eip EIP number
      * @returns Block number or null if unscheduled
      */
     eipBlock(eip: number): bigint | null;
     /**
      * Returns the hardfork change total difficulty (Merge HF) for hardfork provided or set
      * @param hardfork Hardfork name, optional if HF set
      * @returns Total difficulty or null if no set
      */
     hardforkTTD(hardfork?: string | Hardfork_2): bigint | null;
     /**
      * True if block number provided is the hardfork (given or set) change block
      * @param blockNumber Number of the block to check
      * @param hardfork Hardfork name, optional if HF set
      * @returns True if blockNumber is HF block
      */
     isHardforkBlock(blockNumber: BigIntLike, hardfork?: string | Hardfork_2): boolean;
     /**
      * Returns the change block for the next hardfork after the hardfork provided or set
      * @param hardfork Hardfork name, optional if HF set
      * @returns Block number or null if not available
      */
     nextHardforkBlock(hardfork?: string | Hardfork_2): bigint | null;
     /**
      * True if block number provided is the hardfork change block following the hardfork given or set
      * @param blockNumber Number of the block to check
      * @param hardfork Hardfork name, optional if HF set
      * @returns True if blockNumber is HF block
      */
     isNextHardforkBlock(blockNumber: BigIntLike, hardfork?: string | Hardfork_2): boolean;
     /**
      * Internal helper function to calculate a fork hash
      * @param hardfork Hardfork name
      * @param genesisHash Genesis block hash of the chain
      * @returns Fork hash as hex string
      */
     _calcForkHash(hardfork: string | Hardfork_2, genesisHash: Buffer): string;
     /**
      * Returns an eth/64 compliant fork hash (EIP-2124)
      * @param hardfork Hardfork name, optional if HF set
      * @param genesisHash Genesis block hash of the chain, optional if already defined and not needed to be calculated
      */
     forkHash(hardfork?: string | Hardfork_2, genesisHash?: Buffer): string;
     /**
      *
      * @param forkHash Fork hash as a hex string
      * @returns Array with hardfork data (name, block, forkHash)
      */
     hardforkForForkHash(forkHash: string): HardforkConfig | null;
     /**
      * Sets any missing forkHashes on the passed-in {@link Common} instance
      * @param common The {@link Common} to set the forkHashes for
      * @param genesisHash The genesis block hash
      */
     setForkHashes(genesisHash: Buffer): void;
     /**
      * Returns the Genesis parameters of the current chain
      * @returns Genesis dictionary
      */
     genesis(): GenesisBlockConfig;
     /**
      * Returns the hardforks for current chain
      * @returns {Array} Array with arrays of hardforks
      */
     hardforks(): HardforkConfig[];
     /**
      * Returns bootstrap nodes for the current chain
      * @returns {Dictionary} Dict with bootstrap nodes
      */
     bootstrapNodes(): BootstrapNodeConfig[];
     /**
      * Returns DNS networks for the current chain
      * @returns {String[]} Array of DNS ENR urls
      */
     dnsNetworks(): string[];
     /**
      * Returns the hardfork set
      * @returns Hardfork name
      */
     hardfork(): string | Hardfork_2;
     /**
      * Returns the Id of current chain
      * @returns chain Id
      */
     chainId(): bigint;
     /**
      * Returns the name of current chain
      * @returns chain name (lower case)
      */
     chainName(): string;
     /**
      * Returns the Id of current network
      * @returns network Id
      */
     networkId(): bigint;
     /**
      * Returns the active EIPs
      * @returns List of EIPs
      */
     eips(): number[];
     /**
      * Returns the consensus type of the network
      * Possible values: "pow"|"poa"|"pos"
      *
      * Note: This value can update along a Hardfork.
      */
     consensusType(): string | ConsensusType;
     /**
      * Returns the concrete consensus implementation
      * algorithm or protocol for the network
      * e.g. "ethash" for "pow" consensus type,
      * "clique" for "poa" consensus type or
      * "casper" for "pos" consensus type.
      *
      * Note: This value can update along a Hardfork.
      */
     consensusAlgorithm(): string | ConsensusAlgorithm;
     /**
      * Returns a dictionary with consensus configuration
      * parameters based on the consensus algorithm
      *
      * Expected returns (parameters must be present in
      * the respective chain json files):
      *
      * ethash: -
      * clique: period, epoch
      * aura: -
      * casper: -
      *
      * Note: This value can update along a Hardfork.
      */
     consensusConfig(): {
         [key: string]: CliqueConfig | EthashConfig | CasperConfig;
     };
     /**
      * Returns a deep copy of this {@link Common} instance.
      */
     copy(): Common;
     static _getInitializedChains(customChains?: ChainConfig_2[]): ChainsConfig;
    }

    /**
     * Options for instantiating a {@link Common} instance.
     */
    declare interface CommonOpts extends BaseOpts {
        /**
         * Chain name ('mainnet'), id (1), or {@link Chain} enum,
         * either from a chain directly supported or a custom chain
         * passed in via {@link CommonOpts.customChains}.
         */
        chain: string | number | Chain | bigint | object;
        /**
         * Initialize (in addition to the supported chains) with the selected
         * custom chains. Custom genesis state should be passed to the Blockchain class if used.
         *
         * Usage (directly with the respective chain initialization via the {@link CommonOpts.chain} option):
         *
         * ```javascript
         * import myCustomChain1 from '[PATH_TO_MY_CHAINS]/myCustomChain1.json'
         * const common = new Common({ chain: 'myCustomChain1', customChains: [ myCustomChain1 ]})
         * ```
         */
        customChains?: ChainConfig_2[];
    }

    declare type Comparator<T> = (values: T[], a: number, b: number) => boolean;

    /**
     * The raw data for an ethereum transaction.
     */
    declare type Concat<T extends unknown[], U extends unknown[]> = [...T, ...U];

    declare function concatSig(v: Buffer, r: Buffer, s: Buffer): string;

    declare class Connector<R extends JsonRpcRequest<EthereumApi, KnownKeys<EthereumApi>> = JsonRpcRequest<EthereumApi, KnownKeys<EthereumApi>>> extends Emittery<{
        ready: undefined;
        close: undefined;
    }> implements Connector_2<EthereumApi, R | R[], JsonRpcResponse> {
        #private;
        static BUFFERIFY_THRESHOLD: number;
        get provider(): EthereumProvider;
        constructor(providerOptions: ProviderOptions_2, executor: Executor);
        BUFFERIFY_THRESHOLD: number;
        connect(): Promise<void>;
        parse(message: Buffer): R;
        handle(payload: R | R[], connection: HttpRequest | WebSocket): Promise<{
            value: Promise<string | number | boolean | any[] | [] | string[] | [string, string, string] | {
                hash: string;
                type?: string;
                nonce: string;
                blockHash: string;
                blockNumber: string;
                transactionIndex: string;
                from: string;
                to: string;
                value: string;
                gas: string;
                gasPrice: string;
                input: string;
                v: string;
                r: string;
                s: string;
            } | {
                hash: string;
                type: string;
                chainId: string;
                nonce: string;
                blockHash: string;
                blockNumber: string;
                transactionIndex: string;
                from: string;
                to: string;
                value: string;
                gas: string;
                gasPrice: string;
                input: string;
                accessList: {
                    address: string;
                    storageKeys: string[];
                }[];
                v: string;
                r: string;
                s: string;
            } | {
                hash: string;
                type: string;
                chainId: string;
                nonce: string;
                blockHash: string;
                blockNumber: string;
                transactionIndex: string;
                from: string;
                to: string;
                value: string;
                maxPriorityFeePerGas: string;
                maxFeePerGas: string;
                gasPrice: string;
                gas: string;
                input: string;
                accessList: {
                    address: string;
                    storageKeys: string[];
                }[];
                v: string;
                r: string;
                s: string;
            } | {
                type?: string;
                nonce: string;
                blockNumber: null;
                gasPrice: string;
                hash: string;
                gas: string;
                to: string;
                value: string;
                v: string;
                r: string;
                s: string;
                from: string;
                blockHash: null;
                input: string;
                transactionIndex: null;
            } | {
                gas: string;
                structLogs: {
                    depth: number;
                    error: string;
                    gas: string;
                    gasCost: number;
                    memory: string[];
                    op: string;
                    pc: number;
                    stack: string[];
                    storage: {
                        toJSON: {};
                        clear: {};
                        delete: {};
                        forEach: {};
                        get: {};
                        has: {};
                        set: {};
                        readonly size: number;
                        entries: {};
                        keys: {};
                        values: {};
                        [Symbol.iterator]: {};
                        readonly [Symbol.toStringTag]: string;
                    };
                }[];
                returnValue: string;
                storage: {
                    [x: string]: {
                        key: string;
                        value: string;
                    };
                };
            } | {
                nextKey: string;
                storage: {
                    [x: string]: {
                        key: string;
                        value: string;
                    };
                };
            } | {
                address: string;
                balance: string;
                codeHash: string;
                nonce: string;
                storageHash: string;
                accountProof: string[];
                storageProof: {
                    key: string;
                    proof: string[];
                    value: string;
                }[];
            } | {
                number: string;
                miner: string;
                difficulty: string;
                extraData: string;
                nonce: string;
                stateRoot: string;
                hash: string;
                gasLimit: string;
                baseFeePerGas?: string;
                size: string;
                uncles: string[];
                parentHash: string;
                sha3Uncles: string;
                transactionsRoot: string;
                receiptsRoot: string;
                logsBloom: string;
                totalDifficulty: string;
                gasUsed: string;
                timestamp: string;
                mixHash: string;
            } | {
                transactionHash: string;
                transactionIndex: string;
                blockNumber: string;
                blockHash: string;
                from: string;
                to: string;
                cumulativeGasUsed: string;
                gasUsed: string;
                contractAddress: string;
                logs: {
                    address: string;
                    blockHash: string;
                    blockNumber: string;
                    data: string | string[];
                    logIndex: string;
                    removed: boolean;
                    topics: string | string[];
                    transactionHash: string;
                    transactionIndex: string;
                }[];
                logsBloom: string;
                status: string;
                type?: string;
                chainId?: string;
                accessList?: {
                    address: string;
                    storageKeys: string[];
                }[];
                effectiveGasPrice: string;
            } | {
                address: string;
                blockHash: string;
                blockNumber: string;
                data: string | string[];
                logIndex: string;
                removed: boolean;
                topics: string | string[];
                transactionHash: string;
                transactionIndex: string;
            }[] | {
                oldestBlock: string;
                baseFeePerGas: string[];
                gasUsedRatio: number[];
                reward?: string[][];
            } | {
                readonly eth: "1.0";
                readonly net: "1.0";
                readonly rpc: "1.0";
                readonly web3: "1.0";
                readonly evm: "1.0";
                readonly personal: "1.0";
            } | {
                pending: {
                    [x: string]: {
                        [x: string]: {
                            type?: string;
                            nonce: string;
                            blockNumber: null;
                            gasPrice: string;
                            hash: string;
                            gas: string;
                            to: string;
                            value: string;
                            v: string;
                            r: string;
                            s: string;
                            from: string;
                            blockHash: null;
                            input: string;
                            transactionIndex: null;
                        };
                    };
                };
                queued: {
                    [x: string]: {
                        [x: string]: {
                            type?: string;
                            nonce: string;
                            blockNumber: null;
                            gasPrice: string;
                            hash: string;
                            gas: string;
                            to: string;
                            value: string;
                            v: string;
                            r: string;
                            s: string;
                            from: string;
                            blockHash: null;
                            input: string;
                            transactionIndex: null;
                        };
                    };
                };
            } | {
                hash: string;
                size: string;
                transactions: string[] | ({
                    hash: string;
                    type?: string;
                    nonce: string;
                    blockHash: string;
                    blockNumber: string;
                    transactionIndex: string;
                    from: string;
                    to: string;
                    value: string;
                    gas: string;
                    gasPrice: string;
                    input: string;
                    v: string;
                    r: string;
                    s: string;
                } | {
                    hash: string;
                    type: string;
                    chainId: string;
                    nonce: string;
                    blockHash: string;
                    blockNumber: string;
                    transactionIndex: string;
                    from: string;
                    to: string;
                    value: string;
                    gas: string;
                    gasPrice: string;
                    input: string;
                    accessList: {
                        address: string;
                        storageKeys: string[];
                    }[];
                    v: string;
                    r: string;
                    s: string;
                } | {
                    hash: string;
                    type: string;
                    chainId: string;
                    nonce: string;
                    blockHash: string;
                    blockNumber: string;
                    transactionIndex: string;
                    from: string;
                    to: string;
                    value: string;
                    maxPriorityFeePerGas: string;
                    maxFeePerGas: string;
                    gasPrice: string;
                    gas: string;
                    input: string;
                    accessList: {
                        address: string;
                        storageKeys: string[];
                    }[];
                    v: string;
                    r: string;
                    s: string;
                } | {
                    type?: string;
                    nonce: string;
                    blockNumber: null;
                    gasPrice: string;
                    hash: string;
                    gas: string;
                    to: string;
                    value: string;
                    v: string;
                    r: string;
                    s: string;
                    from: string;
                    blockHash: null;
                    input: string;
                    transactionIndex: null;
                })[];
                uncles: string[];
                parentHash: string;
                sha3Uncles: string;
                miner: string;
                stateRoot: string;
                transactionsRoot: string;
                receiptsRoot: string;
                logsBloom: string;
                difficulty: string;
                totalDifficulty: string;
                number: string;
                gasLimit: string;
                gasUsed: string;
                timestamp: string;
                extraData: string;
                mixHash: string;
                nonce: string;
                baseFeePerGas?: string;
            }>;
        }>;
        format(result: any, payload: R): RecognizedString | Generator<RecognizedString>;
        format(result: any, payload: R): RecognizedString;
        format(results: any[], payloads: R[]): RecognizedString;
        formatError(error: Error & {
            code: number;
        }, payload: R): RecognizedString;
        close(): Promise<void>;
    }

    /**
     * Connects an arbitrary public chain provider to ganache
     */
    declare interface Connector_2<ApiImplementation extends Api, RequestFormat, ResponseFormat> extends Emittery<{
        ready: undefined;
        close: undefined;
    }> {
        provider: Provider_2<ApiImplementation>;
        /**
         * Instructs the connector to initialize its internal components. Must return
         * a promise that resolves once it has fully started, or reject if it couldn't
         * start.
         */
        connect: () => Promise<void>;
        /**
         * Parses a raw message into something that can be handled by `handle`
         * @param message -
         */
        parse(message: Buffer): RequestFormat;
        /**
         * Handles a parsed message
         * @param payload -
         */
        handle: ((payload: RequestFormat, connection: HttpRequest) => Promise<{
            value: ReturnType<Api[KnownKeys<Api>]>;
        }>) | ((payload: RequestFormat[], connection: HttpRequest) => Promise<{
            value: ReturnType<Api[KnownKeys<Api>]>[];
        }>) | ((payload: RequestFormat, connection: WebSocket) => Promise<{
            value: ReturnType<Api[KnownKeys<Api>]>;
        }>) | ((payload: RequestFormat[], connection: WebSocket) => Promise<{
            value: ReturnType<Api[KnownKeys<Api>]>[];
        }>);
        /**
         * Formats the response (returned from `handle`)
         * @param response -
         * @param payload -
         */
        format(result: ResponseFormat, payload: RequestFormat): RecognizedString | Generator<RecognizedString>;
        format(result: ResponseFormat, payload: RequestFormat): RecognizedString;
        /**
         * Formats the error response
         * @param error -
         * @param payload -
         */
        formatError(error: Error, payload: RequestFormat): RecognizedString;
        close(): void;
    }

    /**
     * @internal
     */
    declare class Connector_3<R extends JsonRpcRequest<FilecoinApi, KnownKeys<FilecoinApi>> = JsonRpcRequest<FilecoinApi, KnownKeys<FilecoinApi>>> extends Emittery<{
        ready: undefined;
        close: undefined;
    }> implements Connector_2<FilecoinApi, R, JsonRpcResponse> {
        #private;
        get provider(): FilecoinProvider_2<JsonRpcRequest<FilecoinApi, "xrpc.ch.close" | "initialize" | "stop" | "Filecoin.Version" | "Filecoin.ID" | "Filecoin.ChainGetGenesis" | "Filecoin.ChainHead" | "Filecoin.ChainNotify" | "Filecoin.ChainGetTipSet" | "Filecoin.ChainGetTipSetByHeight" | "Filecoin.ChainGetBlock" | "Filecoin.ChainGetBlockMessages" | "Filecoin.ChainGetMessage" | "Filecoin.MpoolGetNonce" | "Filecoin.MpoolPush" | "Filecoin.MpoolBatchPush" | "Filecoin.MpoolPushMessage" | "Filecoin.MpoolBatchPushMessage" | "Filecoin.MpoolClear" | "Filecoin.MpoolPending" | "Filecoin.MpoolSelect" | "Filecoin.ActorAddress" | "Filecoin.StateListMiners" | "Filecoin.StateMinerPower" | "Filecoin.StateMinerInfo" | "Filecoin.WalletDefaultAddress" | "Filecoin.WalletSetDefault" | "Filecoin.WalletBalance" | "Filecoin.WalletNew" | "Filecoin.WalletList" | "Filecoin.WalletHas" | "Filecoin.WalletDelete" | "Filecoin.WalletExport" | "Filecoin.WalletImport" | "Filecoin.WalletSign" | "Filecoin.WalletSignMessage" | "Filecoin.WalletVerify" | "Filecoin.WalletValidateAddress" | "Filecoin.ClientStartDeal" | "Filecoin.ClientListDeals" | "Filecoin.ClientGetDealInfo" | "Filecoin.ClientGetDealStatus" | "Filecoin.ClientGetDealUpdates" | "Filecoin.ClientFindData" | "Filecoin.ClientHasLocal" | "Filecoin.ClientRetrieve" | "Ganache.MineTipset" | "Ganache.EnableMiner" | "Ganache.DisableMiner" | "Ganache.MinerEnabled" | "Ganache.MinerEnabledNotify" | "Ganache.GetDealById">>;
        constructor(providerOptions: Partial<{
            chain: Partial<{
                ipfsHost: string;
                ipfsPort: number;
                asyncRequestProcessing: boolean;
            }>;
            database: Partial<{
                db: string | object;
                dbPath?: undefined;
            } | {
                dbPath: string;
                db?: undefined;
            }>;
            logging: Partial<{
                logger: {
                    log(message?: any, ...optionalParams: any[]): void;
                };
            }>;
            miner: Partial<{
                blockTime: number;
                mine: boolean;
            }>;
            wallet: Partial<{
                deterministic: boolean;
                seed?: undefined;
                totalAccounts: number;
                defaultBalance: number;
            } | {
                seed: string;
                deterministic?: undefined;
                totalAccounts: number;
                defaultBalance: number;
            }>;
        }> | undefined, executor: Executor);
        connect(): Promise<void>;
        parse(message: Buffer): R;
        handle(payload: R, _connection: HttpRequest | WebSocket): Promise<any>;
        format(result: any, payload: R): RecognizedString;
        formatError(error: Error & {
            code: number;
        }, payload: R): RecognizedString;
        close(): Promise<void>;
    }

    declare type ConnectorsByName = {
        [EthereumFlavorName]: Connector;
        [FilecoinFlavorName]: Connector_3;
    };

    /**
     * Interface that a consensus class needs to implement.
     */
    declare interface Consensus {
        algorithm: ConsensusAlgorithm | string;
        /**
         * Initialize genesis for consensus mechanism
         * @param genesisBlock genesis block
         */
        genesisInit(genesisBlock: Block_3): Promise<void>;
        /**
         * Set up consensus mechanism
         */
        setup({ blockchain }: ConsensusOptions): Promise<void>;
        /**
         * Validate block consensus parameters
         * @param block block to be validated
         */
        validateConsensus(block: Block_3): Promise<void>;
        validateDifficulty(header: BlockHeader_2): Promise<void>;
        /**
         * Update consensus on new block
         * @param block new block
         * @param commonAncestor common ancestor block header (optional)
         * @param ancientHeaders array of ancestor block headers (optional)
         */
        newBlock(block: Block_3, commonAncestor?: BlockHeader_2, ancientHeaders?: BlockHeader_2[]): Promise<void>;
    }

    declare enum ConsensusAlgorithm {
        Ethash = "ethash",
        Clique = "clique",
        Casper = "casper"
    }

    /**
     * Options when initializing a class that implements the Consensus interface.
     */
    declare interface ConsensusOptions {
        blockchain: Blockchain_2;
    }

    declare enum ConsensusType {
        ProofOfStake = "pos",
        ProofOfWork = "pow",
        ProofOfAuthority = "poa"
    }

    declare type ConsoleLog = string | bigint | boolean;

    declare type ConsoleLogs = ConsoleLog[];

    declare type Consumer<Value> = (value: Value) => void;

    declare enum CustomChain {
        /**
         * Polygon (Matic) Mainnet
         *
         * - [Documentation](https://docs.matic.network/docs/develop/network-details/network)
         */
        PolygonMainnet = "polygon-mainnet",
        /**
         * Polygon (Matic) Mumbai Testnet
         *
         * - [Documentation](https://docs.matic.network/docs/develop/network-details/network)
         */
        PolygonMumbai = "polygon-mumbai",
        /**
         * Arbitrum Rinkeby Testnet
         *
         * - [Documentation](https://developer.offchainlabs.com/docs/public_testnet)
         */
        ArbitrumRinkebyTestnet = "arbitrum-rinkeby-testnet",
        /**
         * xDai EVM sidechain with a native stable token
         *
         * - [Documentation](https://www.xdaichain.com/)
         */
        xDaiChain = "x-dai-chain",
        /**
         * Optimistic Kovan - testnet for Optimism roll-up
         *
         * - [Documentation](https://community.optimism.io/docs/developers/tutorials.html)
         */
        OptimisticKovan = "optimistic-kovan",
        /**
         * Optimistic Ethereum - mainnet for Optimism roll-up
         *
         * - [Documentation](https://community.optimism.io/docs/developers/tutorials.html)
         */
        OptimisticEthereum = "optimistic-ethereum"
    }

    /**
     * Options to be used with the {@link Common.custom} static constructor.
     */
    declare interface CustomCommonOpts extends BaseOpts {
        /**
         * The name (`mainnet`), id (`1`), or {@link Chain} enum of
         * a standard chain used to base the custom chain params on.
         */
        baseChain?: string | number | Chain | bigint;
    }

    declare type CustomOpcode = AddOpcode | DeleteOpcode;

    declare type CustomPrecompile = AddPrecompile | DeletePrecompile;

    declare type DATA = string;

    declare class Data extends BaseJsonRpcType {
        private _byteLength?;
        static Empty: Data;
        constructor(value: JsonRpcDataInputArg, _byteLength?: number);
        toString(byteLength?: number): string | null;
        toBuffer(byteLength?: number): Buffer;
        static from(value: JsonRpcDataInputArg, byteLength?: number): Data;
        private static stringToFixedByteLength;
        private static bufferToFixedByteLength;
        static toBuffer(value: JsonRpcDataInputArg, byteLength?: number): Buffer;
        static toString(value: JsonRpcDataInputArg, byteLength?: number): string;
    }

    declare class Database extends Emittery {
        #private;
        readonly blockchain: Blockchain;
        directory: string;
        db: GanacheLevelUp;
        blocks: GanacheLevelUp;
        blockIndexes: GanacheLevelUp;
        blockLogs: GanacheLevelUp;
        transactions: GanacheLevelUp;
        transactionReceipts: GanacheLevelUp;
        storageKeys: GanacheLevelUp;
        trie: TrieDB;
        readonly initialized: boolean;
        /**
         * The Database handles the creation of the database, and all access to it.
         * Once the database has been fully initialized it will emit a `ready`
         * event.
         * @param options - Supports one of two options: `db` (a leveldown compliant
         * store instance) or `dbPath` (the path to store/read the db instance)
         * @param blockchain -
         */
        constructor(options: EthereumInternalOptions["database"], blockchain: Blockchain);
        initialize: () => Promise<void>;
        /**
         * Call `batch` to batch `put` and `del` operations within the same
         * event loop tick of the provided function. All db operations within the
         * batch _must_ be executed synchronously.
         * @param fn - Within this function's event loop tick, all `put` and
         * `del` database operations are applied in a single atomic operation. This
         * provides a single write call and if any individual put/del's fail the
         * entire operation fails and no modifications are made.
         * @returns a Promise that resolves to the return value
         * of the provided function.
         */
        batch<T>(fn: () => T): Promise<T>;
        /**
         * Gracefully closes the database and cleans up the file system and waits for
         * it to fully shut down. Emits a `close` event once complete.
         * Note: only emits `close` once.
         */
        close(): Promise<void>;
    }

    declare class Database_2 extends Emittery {
        #private;
        directory: string | null;
        db: LevelUp | null;
        tipsets: LevelUp | null;
        blocks: LevelUp | null;
        accounts: LevelUp | null;
        privateKeys: LevelUp | null;
        signedMessages: LevelUp | null;
        blockMessages: LevelUp | null;
        deals: LevelUp | null;
        dealExpirations: LevelUp | null;
        get initialized(): boolean;
        /**
         * The Database handles the creation of the database, and all access to it.
         * Once the database has been fully initialized it will emit a `ready`
         * event.
         * @param options - Supports one of two options: `db` (a leveldown compliant
         * store instance) or `dbPath` (the path to store/read the db instance)
         * @param blockchain -
         */
        constructor(options: FilecoinInternalOptions["database"]);
        initialize: () => Promise<void>;
        /**
         * Call `batch` to batch `put` and `del` operations within the same
         * event loop tick of the provided function. All db operations within the
         * batch _must_ be executed synchronously.
         * @param fn - Within this function's event loop tick, all `put` and
         * `del` database operations are applied in a single atomic operation. This
         * provides a single write call and if any individual put/del's fail the
         * entire operation fails and no modifications are made.
         * @returns a Promise that resolves to the return value
         * of the provided function.
         */
        batch<T>(fn: () => T): Promise<T>;
        /**
         * Gracefully closes the database and cleans up the file system and waits for
         * it to fully shut down. Emits a `close` event once complete.
         * Note: only emits `close` once.
         */
        close(): Promise<void>;
    }

    declare type DatabaseConfig = {
        options: {
            /**
             * Specify an alternative database instance, like MemDOWN
             */
            db: {
                type: string | object;
                legacy: {
                    /**
                     * @deprecated Use database.db instead
                     */
                    db: string | object;
                };
            };
            /**
             * Specify a path to a directory to save the chain database. If a database
             * already exists, that chain will be initialized instead of creating a new
             * one.
             */
            dbPath: {
                type: string;
                legacy: {
                    /**
                     * @deprecated Use database.dbPath instead
                     */
                    db_path: string;
                };
            };
        };
        exclusiveGroups: [["db", "dbPath"]];
    };

    declare type DatabaseConfig_2 = {
        options: {
            /**
             * Specify an alternative database instance, like MemDOWN
             */
            db: {
                type: string | object;
            };
            /**
             * Specify a path to a directory to save the chain database. If a database
             * already exists, that chain will be initialized instead of creating a new
             * one.
             */
            dbPath: {
                type: string;
            };
        };
        exclusiveGroups: [["db", "dbPath"]];
    };

    declare type DatabaseKey = {
        blockNumber?: bigint;
        blockHash?: Buffer;
    };

    declare type DataEvent = {
        jsonrpc: "2.0";
        method: "eth_subscription";
        params: any;
    };

    declare class DataTransferChannel extends SerializableObject<DataTransferChannelConfig> implements DeserializedObject<DataTransferChannelConfig> {
        get config(): Definitions<DataTransferChannelConfig>;
        constructor(options?: Partial<SerializedObject<DataTransferChannelConfig>> | Partial<DeserializedObject<DataTransferChannelConfig>>);
        transferId: number;
        status: number;
        baseCID: RootCID;
        isInitiator: boolean;
        isSender: boolean;
        voucher: string;
        message: string;
        otherPeer: string;
        transferred: number;
    }

    declare type DataTransferChannelConfig = {
        properties: {
            transferId: {
                type: number;
                serializedType: number;
                serializedName: "TransferID";
            };
            status: {
                type: number;
                serializedType: number;
                serializedName: "Status";
            };
            baseCID: {
                type: RootCID;
                serializedType: SerializedRootCID;
                serializedName: "BaseCID";
            };
            isInitiator: {
                type: boolean;
                serializedType: boolean;
                serializedName: "IsInitiator";
            };
            isSender: {
                type: boolean;
                serializedType: boolean;
                serializedName: "IsSender";
            };
            voucher: {
                type: string;
                serializedType: string;
                serializedName: "Voucher";
            };
            message: {
                type: string;
                serializedType: string;
                serializedName: "Message";
            };
            otherPeer: {
                type: string;
                serializedType: string;
                serializedName: "OtherPeer";
            };
            transferred: {
                type: number;
                serializedType: number;
                serializedName: "Transferred";
            };
        };
    };

    declare interface DB {
        /**
         * Retrieves a raw value from leveldb.
         * @param key
         * @returns A Promise that resolves to `Buffer` if a value is found or `null` if no value is found.
         */
        get(key: Buffer): Promise<Buffer | null>;
        /**
         * Writes a value directly to leveldb.
         * @param key The key as a `Buffer`
         * @param value The value to be stored
         */
        put(key: Buffer, val: Buffer): Promise<void>;
        /**
         * Removes a raw value in the underlying leveldb.
         * @param keys
         */
        del(key: Buffer): Promise<void>;
        /**
         * Performs a batch operation on db.
         * @param opStack A stack of levelup operations
         */
        batch(opStack: BatchDBOp[]): Promise<void>;
        /**
         * Returns a copy of the DB instance, with a reference
         * to the **same** underlying leveldb instance.
         */
        copy(): DB;
    }

    /**
     * Abstraction over a DB to facilitate storing/fetching blockchain-related
     * data, such as blocks and headers, indices, and the head block.
     * @hidden
     */
    declare class DBManager {
        private _cache;
        private _common;
        private _db;
        constructor(db: AbstractLevel<string | Buffer | Uint8Array, string | Buffer, string | Buffer>, common: Common);
        /**
         * Fetches iterator heads from the db.
         */
        getHeads(): Promise<{
            [key: string]: Buffer;
        }>;
        /**
         * Fetches header of the head block.
         */
        getHeadHeader(): Promise<Buffer>;
        /**
         * Fetches head block.
         */
        getHeadBlock(): Promise<Buffer>;
        /**
         * Fetches a block (header and body) given a block id,
         * which can be either its hash or its number.
         */
        getBlock(blockId: Buffer | bigint | number): Promise<Block_3>;
        /**
         * Fetches body of a block given its hash and number.
         */
        getBody(blockHash: Buffer, blockNumber: bigint): Promise<BlockBodyBuffer>;
        /**
         * Fetches header of a block given its hash and number.
         */
        getHeader(blockHash: Buffer, blockNumber: bigint): Promise<BlockHeader_2>;
        /**
         * Fetches total difficulty for a block given its hash and number.
         */
        getTotalDifficulty(blockHash: Buffer, blockNumber: bigint): Promise<bigint>;
        /**
         * Performs a block hash to block number lookup.
         */
        hashToNumber(blockHash: Buffer): Promise<bigint>;
        /**
         * Performs a block number to block hash lookup.
         */
        numberToHash(blockNumber: bigint): Promise<Buffer>;
        /**
         * Fetches a key from the db. If `opts.cache` is specified
         * it first tries to load from cache, and on cache miss will
         * try to put the fetched item on cache afterwards.
         */
        get(dbOperationTarget: DBTarget, key?: DatabaseKey): Promise<any>;
        /**
         * Performs a batch operation on db.
         */
        batch(ops: DBOp[]): Promise<void>;
    }

    /**
     * The DBOp class aids creating database operations which is used by `level` using a more high-level interface
     */
    declare class DBOp {
        operationTarget: DBTarget;
        baseDBOp: DBOpData;
        cacheString: string | undefined;
        private constructor();
        static get(operationTarget: DBTarget, key?: DatabaseKey): DBOp;
        static set(operationTarget: DBTarget, value: Buffer | object, key?: DatabaseKey): DBOp;
        static del(operationTarget: DBTarget, key?: DatabaseKey): DBOp;
        updateCache(cacheMap: CacheMap): void;
    }

    /**
     * DBOpData is a type which has the purpose of holding the actual data of the Database Operation.
     * @hidden
     */
    declare interface DBOpData {
        type?: string;
        key: Buffer | string;
        keyEncoding: string;
        valueEncoding?: string;
        value?: Buffer | object;
    }

    declare enum DBTarget {
        Heads = 0,
        HeadHeader = 1,
        HeadBlock = 2,
        HashToNumber = 3,
        NumberToHash = 4,
        TotalDifficulty = 5,
        Body = 6,
        Header = 7,
        CliqueSignerStates = 8,
        CliqueVotes = 9,
        CliqueBlockSigners = 10
    }

    declare class DealInfo extends SerializableObject<DealInfoConfig> implements DeserializedObject<DealInfoConfig> {
        get config(): Definitions<DealInfoConfig>;
        constructor(options?: Partial<SerializedObject<DealInfoConfig>> | Partial<DeserializedObject<DealInfoConfig>>);
        proposalCid: RootCID;
        state: StorageDealStatus;
        message: string;
        provider: Address_3;
        dataRef: StorageMarketDataRef;
        pieceCid: RootCID | null;
        size: number;
        pricePerEpoch: bigint;
        duration: number;
        dealId: number;
        creationTime: Date;
        verified: boolean;
        transferChannelId: ChannelID;
        dataTransfer: DataTransferChannel;
        advanceState(): void;
    }

    declare type DealInfoConfig = {
        properties: {
            proposalCid: {
                type: RootCID;
                serializedType: SerializedRootCID;
                serializedName: "ProposalCid";
            };
            state: {
                type: StorageDealStatus;
                serializedType: StorageDealStatus;
                serializedName: "State";
            };
            message: {
                type: string;
                serializedType: string;
                serializedName: "Message";
            };
            provider: {
                type: Address_3;
                serializedType: SerializedAddress;
                serializedName: "Provider";
            };
            dataRef: {
                type: StorageMarketDataRef;
                serializedType: SerializedStorageMarketDataRef;
                serializedName: "DataRef";
            };
            pieceCid: {
                type: RootCID | null;
                serializedType: SerializedRootCID | null;
                serializedName: "PieceCID";
            };
            size: {
                type: number;
                serializedType: number;
                serializedName: "Size";
            };
            pricePerEpoch: {
                type: bigint;
                serializedType: string;
                serializedName: "PricePerEpoch";
            };
            duration: {
                type: number;
                serializedType: number;
                serializedName: "Duration";
            };
            dealId: {
                type: number;
                serializedType: number;
                serializedName: "DealID";
            };
            creationTime: {
                type: Date;
                serializedType: string;
                serializedName: "CreationTime";
            };
            verified: {
                type: boolean;
                serializedType: boolean;
                serializedName: "Verified";
            };
            transferChannelId: {
                type: ChannelID;
                serializedType: SerializedChannelID;
                serializedName: "TransferChannelID";
            };
            dataTransfer: {
                type: DataTransferChannel;
                serializedType: SerializedDataTransferChannel;
                serializedName: "DataTransfer";
            };
        };
    };

    /**
     * TODO: (Issue ganache#868) This loads all Deal CIDs and
     * then all the deals themselves into memory. The downstream
     * consumers of this manager then filters them at every time
     * it's used (i.e. filters them by DealInfo.State).
     *
     * We'll need to rework this in the future. LevelDB has a
     * `createReadStream` method that could help with some of this;
     * but David M. thinks we'll also need to add another sublevel
     * that acts as an index for deal states.
     */
    declare class DealInfoManager extends Manager_2<DealInfo, DealInfoConfig> {
        #private;
        static Deals: Buffer;
        static initialize(base: LevelUp, dealExpirations: LevelUp): Promise<DealInfoManager>;
        constructor(base: LevelUp, dealExpirations: LevelUp);
        updateDealInfo(deal: DealInfo): Promise<void>;
        addDealInfo(deal: DealInfo, expirationTipsetHeight: number): Promise<void>;
        getDealCids(): Promise<Array<SerializedRootCID>>;
        getDeals(): Promise<Array<DealInfo>>;
        getDealById(dealId: number): Promise<DealInfo | null>;
        getDealExpiration(proposalId: RootCID): Promise<number | null>;
        private putDealCids;
    }

    declare function decrypt(encryptedData: EthEncryptedData, receiverPrivateKey: string): string;

    declare function decryptSafely(encryptedData: EthEncryptedData, receiverPrivateKey: string): string;

    declare type DeepTupleToUnion<T extends unknown[]> = T extends [] ? never : T extends [infer N, ...infer R] ? N extends unknown[] ? DeepTupleToUnion<N> | DeepTupleToUnion<R> : N | DeepTupleToUnion<R> : never;

    declare const DefaultFlavor = "ethereum";

    declare type DefaultValue<D, S> = D | ((options?: S) => D);

    declare type DefaultValue_2<S, D> = D | ((options: S | undefined) => D);

    declare type Definition<C extends BaseConfig, N extends PropertyName<C>> = {
        deserializedName: N;
        serializedName: SerializedPropertyName<C, N>;
        defaultValue: DefaultValue<PropertyType<C, N>, SerializedPropertyType<C, N>>;
    };

    declare type Definitions<C extends BaseConfig> = {
        [N in PropertyName<C>]: Definition<C, N>;
    };

    declare interface DelBatch<K = any, V = any> {
        readonly type: 'del';
        readonly key: K;
    }

    declare interface DelBatch_2 {
        type: 'del';
        key: Buffer;
    }

    declare type DeleteOpcode = {
        opcode: number;
    };

    declare type DeletePrecompile = {
        address: Address_2;
    };

    declare type DeserializedObject<C extends BaseConfig> = {
        [N in PropertyName<C>]: PropertyType<C, N>;
    };

    /**
     * API for an EEI (Ethereum Environment Interface) implementation
     *
     * This can be used to connect the EVM to different (chain) environments.
     * An implementation for an EEI to connect to an Ethereum execution chain
     * environment (`mainnet`, `sepolia`,...) can be found in the
     * `@ethereumjs/vm` package.
     */
    declare interface EEIInterface extends EVMStateAccess {
        getBlockHash(num: bigint): Promise<bigint>;
        storageStore(address: Address_2, key: Buffer, value: Buffer): Promise<void>;
        storageLoad(address: Address_2, key: Buffer, original: boolean): Promise<Buffer>;
        copy(): EEIInterface;
    }

    declare type EIP1559FeeMarketDatabasePayload = [
    chainId: Buffer,
    nonce: Buffer,
    maxPriorityFeePerGas: Buffer,
    maxFeePerGas: Buffer,
    gas: Buffer,
    to: Buffer,
    value: Buffer,
    data: Buffer,
    accessList: AccessListBuffer,
    v: Buffer,
    r: Buffer,
    s: Buffer
    ];

    declare type EIP1559FeeMarketDatabaseTx = Concat<TxType, EIP1559FeeMarketDatabasePayload>;

    declare type EIP1559FeeMarketRpcTransaction = Readonly<RpcTransaction> & {
        readonly type?: TxType_2;
        readonly chainId?: string;
        readonly gasPrice?: never;
        readonly maxPriorityFeePerGas?: string;
        readonly maxFeePerGas?: string;
        readonly accessList?: AccessList;
    };

    declare class EIP1559FeeMarketTransaction extends RuntimeTransaction {
        chainId: Quantity;
        maxPriorityFeePerGas: Quantity;
        maxFeePerGas: Quantity;
        accessList: AccessListBuffer;
        accessListJSON: AccessList;
        accessListDataFee: bigint;
        type: Quantity;
        constructor(data: EIP1559FeeMarketDatabasePayload | Transaction, common: Common, extra?: GanacheRawExtraTx);
        maxGasPrice(): Quantity;
        toJSON(_common?: Common): EIP1559FeeMarketTransactionJSON;
        static fromTxData(data: EIP1559FeeMarketDatabasePayload | Transaction, common: Common, extra?: GanacheRawExtraTx): EIP1559FeeMarketTransaction;
        toVmTransaction(): {
            hash: () => Buffer;
            nonce: bigint;
            maxPriorityFeePerGas: bigint;
            maxFeePerGas: bigint;
            gasLimit: bigint;
            to: Address;
            value: bigint;
            data: Buffer;
            AccessListJSON: AccessList;
            getSenderAddress: () => Address;
            /**
             * the minimum amount of gas the tx must have (DataFee + TxFee + Creation Fee)
             */
            getBaseFee: () => bigint;
            getUpfrontCost: (baseFee?: bigint) => bigint;
            supports: (capability: Capability) => boolean;
        };
        /**
         * sign a transaction with a given private key, then compute and set the `hash`.
         *
         * @param privateKey - Must be 32 bytes in length
         */
        signAndHash(privateKey: Buffer): void;
        toEthRawTransaction(v: Buffer, r: Buffer, s: Buffer): EIP1559FeeMarketDatabaseTx;
        computeIntrinsics(v: Quantity, raw: TypedDatabaseTransaction): {
            from: Address;
            hash: Data;
            serialized: Buffer;
            encodedData: EncodedPart;
            encodedSignature: EncodedPart;
        };
        updateEffectiveGasPrice(baseFeePerGas: Quantity): void;
    }

    declare type EIP1559FeeMarketTransactionJSON = {
        hash: Data;
        type: Quantity;
        chainId: Quantity;
        nonce: Quantity;
        blockHash: Data;
        blockNumber: Quantity;
        transactionIndex: Quantity;
        from: Address;
        to: Address;
        value: Quantity;
        maxPriorityFeePerGas: Quantity;
        maxFeePerGas: Quantity;
        gasPrice: Quantity;
        gas: Quantity;
        input: Data;
        accessList: AccessList;
        v: Quantity;
        r: Quantity;
        s: Quantity;
    };

    declare type EIP2930AccessListDatabasePayload = [
    chainId: Buffer,
    nonce: Buffer,
    gasPrice: Buffer,
    gas: Buffer,
    to: Buffer,
    value: Buffer,
    data: Buffer,
    accessList: AccessListBuffer,
    v: Buffer,
    r: Buffer,
    s: Buffer
    ];

    declare type EIP2930AccessListDatabaseTx = Concat<TxType, EIP2930AccessListDatabasePayload>;

    declare type EIP2930AccessListRpcTransaction = Readonly<RpcTransaction> & {
        readonly type?: TxType_2;
        readonly chainId?: string;
        readonly gasPrice?: string;
        readonly accessList?: AccessList;
        readonly maxPriorityFeePerGas?: never;
        readonly maxFeePerGas?: never;
    };

    declare class EIP2930AccessListTransaction extends RuntimeTransaction {
        chainId: Quantity;
        accessList: AccessListBuffer;
        accessListJSON: AccessList;
        accessListDataFee: bigint;
        gasPrice: Quantity;
        type: Quantity;
        constructor(data: EIP2930AccessListDatabasePayload | Transaction, common: Common, extra?: GanacheRawExtraTx);
        maxGasPrice(): Quantity;
        toJSON(_common?: Common): EIP2930AccessListTransactionJSON;
        static fromTxData(data: EIP2930AccessListDatabasePayload | Transaction, common: Common, extra?: GanacheRawExtraTx): EIP2930AccessListTransaction;
        toVmTransaction(): {
            hash: () => Buffer;
            nonce: bigint;
            gasPrice: bigint;
            gasLimit: bigint;
            to: Address;
            value: bigint;
            data: Buffer;
            AccessListJSON: AccessList;
            getSenderAddress: () => Address;
            /**
             * the minimum amount of gas the tx must have (DataFee + TxFee + Creation Fee)
             */
            getBaseFee: () => bigint;
            getUpfrontCost: () => bigint;
            supports: (capability: Capability) => boolean;
        };
        /**
         * sign a transaction with a given private key, then compute and set the `hash`.
         *
         * @param privateKey - Must be 32 bytes in length
         */
        signAndHash(privateKey: Buffer): void;
        toEthRawTransaction(v: Buffer, r: Buffer, s: Buffer): EIP2930AccessListDatabaseTx;
        computeIntrinsics(v: Quantity, raw: TypedDatabaseTransaction): {
            from: Address;
            hash: Data;
            serialized: Buffer;
            encodedData: EncodedPart;
            encodedSignature: EncodedPart;
        };
        updateEffectiveGasPrice(): void;
    }

    declare type EIP2930AccessListTransactionJSON = {
        hash: Data;
        type: Quantity;
        chainId: Quantity;
        nonce: Quantity;
        blockHash: Data;
        blockNumber: Quantity;
        transactionIndex: Quantity;
        from: Address;
        to: Address;
        value: Quantity;
        gas: Quantity;
        gasPrice: Quantity;
        input: Data;
        accessList: AccessList;
        v: Quantity;
        r: Quantity;
        s: Quantity;
    };

    declare interface EIP712TypedData {
        name: string;
        type: string;
        value: any;
    }

    declare class ElectionProof extends SerializableObject<ElectionProofConfig> implements DeserializedObject<ElectionProofConfig> {
        get config(): Definitions<ElectionProofConfig>;
        constructor(options?: Partial<SerializedObject<ElectionProofConfig>> | Partial<DeserializedObject<ElectionProofConfig>>);
        winCount: number;
        vrfProof: Buffer;
    }

    declare interface ElectionProofConfig {
        properties: {
            winCount: {
                type: number;
                serializedType: number;
                serializedName: "WinCount";
            };
            vrfProof: {
                type: Buffer;
                serializedType: string;
                serializedName: "VRFProof";
            };
        };
    }

    declare type EmbeddedNode = Buffer | Buffer[];

    declare const emitteryMethods: readonly ["clearListeners", "once", "on", "emit", "onAny"];

    declare type EncodedPart = {
        length: number;
        output: Buffer[];
    };

    declare class EncodingError extends LevelUPError {}

    declare function encrypt<T extends MessageTypes>(receiverPublicKey: string, msgParams: MsgParams<TypedData | TypedMessage<T>>, version: string): EthEncryptedData;

    declare function encryptSafely<T extends MessageTypes>(receiverPublicKey: string, msgParams: MsgParams<TypedData | TypedMessage<T>>, version: string): EthEncryptedData;

    declare type EncryptType = ThenArg<ReturnType<Wallet["encrypt"]>>;

    declare interface Env {
        address: Address_2;
        caller: Address_2;
        callData: Buffer;
        callValue: bigint;
        code: Buffer;
        isStatic: boolean;
        depth: number;
        gasPrice: bigint;
        origin: Address_2;
        block: Block_2;
        contract: Account_2;
        codeAddress: Address_2;
        gasRefund: bigint;
        containerCode?: Buffer; /** Full container code for EOF1 contracts */
    }

    declare enum ERROR {
        OUT_OF_GAS = "out of gas",
        CODESTORE_OUT_OF_GAS = "code store out of gas",
        CODESIZE_EXCEEDS_MAXIMUM = "code size to deposit exceeds maximum code size",
        STACK_UNDERFLOW = "stack underflow",
        STACK_OVERFLOW = "stack overflow",
        INVALID_JUMP = "invalid JUMP",
        INVALID_OPCODE = "invalid opcode",
        OUT_OF_RANGE = "value out of range",
        REVERT = "revert",
        STATIC_STATE_CHANGE = "static state change",
        INTERNAL_ERROR = "internal error",
        CREATE_COLLISION = "create collision",
        STOP = "stop",
        REFUND_EXHAUSTED = "refund exhausted",
        VALUE_OVERFLOW = "value overflow",
        INSUFFICIENT_BALANCE = "insufficient balance",
        INVALID_BEGINSUB = "invalid BEGINSUB",
        INVALID_RETURNSUB = "invalid RETURNSUB",
        INVALID_JUMPSUB = "invalid JUMPSUB",
        INVALID_BYTECODE_RESULT = "invalid bytecode deployed",
        INVALID_EOF_FORMAT = "invalid EOF format",
        INITCODE_SIZE_VIOLATION = "initcode exceeds max initcode size",
        AUTHCALL_UNSET = "attempting to AUTHCALL without AUTH set",
        AUTHCALL_NONZERO_VALUEEXT = "attempting to execute AUTHCALL with nonzero external value",
        AUTH_INVALID_S = "invalid Signature: s-values greater than secp256k1n/2 are considered invalid",
        BLS_12_381_INVALID_INPUT_LENGTH = "invalid input length",
        BLS_12_381_POINT_NOT_ON_CURVE = "point not on curve",
        BLS_12_381_INPUT_EMPTY = "input is empty",
        BLS_12_381_FP_NOT_IN_FIELD = "fp point not in field"
    }

    declare type ErrorCallback = (err: Error | undefined) => void;

    declare type ErrorKeyValueCallback<K, V> = (err: Error | undefined, key: K, value: V) => void;

    declare type ErrorValueCallback<V> = (err: Error | undefined, value: V) => void;

    declare type EthashConfig = {};

    declare interface EthEncryptedData {
        version: string;
        nonce: string;
        ephemPublicKey: string;
        ciphertext: string;
    }

    /** Public types */
    export declare namespace Ethereum {
        export type Provider = EthereumProvider;
        export type Tag = keyof typeof InternalTag;
        export type TraceTransactionOptions = UtilTypes.TraceTransactionOptions;
        export type TraceTransactionResult<P extends PublicPrivate = "public"> = P extends "public" ? Externalize<TraceTransactionResult<"private">> : UtilTypes.TraceTransactionResult;
        export type StorageRangeAtResult<P extends PublicPrivate = "public"> = P extends "public" ? Externalize<StorageRangeAtResult<"private">> : UtilTypes.StorageRangeAtResult;
        export type SubscriptionOptions = UtilTypes.BaseFilterArgs;
        export type LogsFilter = UtilTypes.FilterArgs;
        export type Filter = UtilTypes.RangeFilterArgs;
        export type SubscriptionName = UtilTypes.SubscriptionName;
        export type SubscriptionId = UtilTypes.SubscriptionId;
        export type Logs = Log_2[];
        export namespace Transaction {
            export type Legacy = Flatten<TransactionTypes.LegacyRpcTransaction>;
            export type EIP1559 = Flatten<TransactionTypes.EIP1559FeeMarketRpcTransaction>;
            export type EIP2930 = Flatten<TransactionTypes.EIP2930AccessListRpcTransaction>;
            /**
             * Transaction receipt returned from `eth_getTransactionReceipt`
             */
            export type Receipt<P extends PublicPrivate = "public"> = P extends "public" ? Externalize<Transaction.Receipt<"private">> : TransactionTypes.TransactionReceipt;
        }
        /**
         * Transaction types sent to `eth_sendTransaction` and
         * `personal_sendTransaction`
         */
        export type Transaction = Ethereum.Transaction.Legacy | Ethereum.Transaction.EIP1559 | Ethereum.Transaction.EIP2930;
        export namespace Call {
            export namespace Transaction {
                export type Legacy = AsCall<Ethereum.Transaction.Legacy>;
                export type EIP1559 = AsCall<Ethereum.Transaction.EIP1559>;
                export type EIP2930 = AsCall<Ethereum.Transaction.EIP2930>;
            }
            export type Transaction = Ethereum.Call.Transaction.Legacy | Ethereum.Call.Transaction.EIP1559 | Ethereum.Call.Transaction.EIP2930;
            export type Overrides = CallOverrides;
        }
        export namespace Pool {
            export namespace Transaction {
                export type Legacy = AsPooled<Ethereum.Block.Transaction.Legacy>;
                export type EIP1559 = AsPooled<Ethereum.Block.Transaction.EIP1559>;
                export type EIP2930 = AsPooled<Ethereum.Block.Transaction.EIP2930>;
            }
            /**
             * Pending and Executable transactions that are still in the transaction pool
             * and do not yet have a blockNumber, blockHash, and transactionIndex.
             */
            export type Transaction<P extends PublicPrivate = "public"> = AsPooled<Ethereum.Block.Transaction<P>>;
            export type Content<P extends PublicPrivate = "public"> = {
                pending: Record<string, Record<string, Ethereum.Pool.Transaction<P>>>;
                queued: Record<string, Record<string, Ethereum.Pool.Transaction<P>>>;
            };
        }
        export namespace Block {
            export type Header<P extends PublicPrivate = "public"> = P extends "public" ? Externalize<Ethereum.Block.Header<"private">> : BlockHeader;
            export namespace Transaction {
                export type Legacy = Externalize<TransactionTypes.LegacyTransactionJSON>;
                export type EIP2930 = Externalize<TransactionTypes.EIP2930AccessListTransactionJSON>;
                export type EIP1559 = Externalize<TransactionTypes.EIP1559FeeMarketTransactionJSON>;
            }
            export type Transaction<P extends PublicPrivate = "public"> = P extends "public" ? Externalize<Ethereum.Block.Transaction<"private">> : TransactionTypes.LegacyTransactionJSON | TransactionTypes.EIP2930AccessListTransactionJSON | TransactionTypes.EIP1559FeeMarketTransactionJSON;
        }
        /**
         * A Block as it is returned from eth_getBlockByNumber and eth_getBlockByHash.
         */
        export type Block<IncludeTransactions extends boolean = true | false, P extends PublicPrivate = "public"> = P extends "public" ? Externalize<Ethereum.Block<IncludeTransactions, "private">> : {
            hash: Data;
            size: Quantity;
            transactions: IncludeTransactions extends true ? (Ethereum.Block.Transaction<P> | Ethereum.Pool.Transaction<P>)[] : Data[];
            uncles: Data[];
        } & Ethereum.Block.Header<P>;
        export type MineOptions = {
            timestamp?: number;
            blocks?: number;
        };
        export type TypedData = Exclude<EthSignedDataParams, EthSigUtil.TypedData>;
        export type WhisperPostObject = UtilTypes.WhisperPostObject;
        export type FeeHistory<P extends PublicPrivate = "public"> = P extends "public" ? Externalize<FeeHistory<"private">> : UtilTypes.FeeHistory;
        export type AccountProof<P extends PublicPrivate = "public"> = P extends "public" ? Externalize<AccountProof<"private">> : UtilTypes.AccountProof;
    }

    declare class EthereumApi implements Api {
        #private;
        readonly [index: string]: (...args: any) => Promise<any>;
        /**
         * This is the Ethereum API that the provider interacts with.
         * The only methods permitted on the prototype are the supported json-rpc
         * methods.
         * @param options -
         * @param wallet -
         * @param emitter -
         */
        constructor(options: EthereumInternalOptions, wallet: Wallet, blockchain: Blockchain);
        /**
         * Stores a string in the local database.
         *
         * @param dbName - Database name.
         * @param key - Key name.
         * @param value - String to store.
         * @returns returns true if the value was stored, otherwise false.
         * @example
         * ```javascript
         * console.log(await provider.send("db_putString", ["testDb", "testKey", "testValue"] ));
         * ```
         */
        db_putString(dbName: string, key: string, value: string): Promise<boolean>;
        /**
         * Returns string from the local database.
         *
         * @param dbName - Database name.
         * @param key - Key name.
         * @returns The previously stored string.
         * @example
         * ```javascript
         * console.log(await provider.send("db_getString", ["testDb", "testKey"] ));
         * ```
         */
        db_getString(dbName: string, key: string): Promise<string>;
        /**
         * Stores binary data in the local database.
         *
         * @param dbName - Database name.
         * @param key - Key name.
         * @param data - Data to store.
         * @returns true if the value was stored, otherwise false.
         * @example
         * ```javascript
         * console.log(await provider.send("db_putHex", ["testDb", "testKey", "0x0"] ));
         * ```
         */
        db_putHex(dbName: string, key: string, data: DATA): Promise<boolean>;
        /**
         * Returns binary data from the local database.
         *
         * @param dbName - Database name.
         * @param key - Key name.
         * @returns The previously stored data.
         * @example
         * ```javascript
         * console.log(await provider.send("db_getHex", ["testDb", "testKey"] ));
         * ```
         */
        db_getHex(dbName: string, key: string): Promise<string>;
        /**
         * Returns the kademlia table in a readable table format.
         * @returns Returns the kademlia table in a readable table format.
         * @example
         * ```javascript
         * console.log(await provider.send("bzz_hive"));
         * ```
         */
        bzz_hive(): Promise<any[]>;
        /**
         * Returns details about the swarm node.
         * @returns Returns details about the swarm node.
         * @example
         * ```javascript
         * console.log(await provider.send("bzz_info"));
         * ```
         */
        bzz_info(): Promise<any[]>;
        /**
         * Force a single block to be mined.
         *
         * Mines a block independent of whether or not mining is started or stopped.
         * Will mine an empty block if there are no available transactions to mine.
         *
         * @param timestamp - the timestamp the block should be mined with.
         * EXPERIMENTAL: Optionally, specify an `options` object with `timestamp`
         * and/or `blocks` fields. If `blocks` is given, it will mine exactly `blocks`
         *  number of blocks, regardless of any other blocks mined or reverted during it's
         * operation. This behavior is subject to change!
         *
         * @returns The string `"0x0"`. May return additional meta-data in the future.
         *
         * @example
         * ```javascript
         * console.log("start", await provider.send("eth_blockNumber"));
         * await provider.send("evm_mine", [{blocks: 5}] ); // mines 5 blocks
         * console.log("end", await provider.send("eth_blockNumber"));
         * ```
         */
        evm_mine(): Promise<"0x0">;
        evm_mine(timestamp: number): Promise<"0x0">;
        evm_mine(options: Ethereum.MineOptions): Promise<"0x0">;
        /**
         * Sets the given account's nonce to the specified value. Mines a new block
         * before returning.
         *
         * Warning: this will result in an invalid state tree.
         *
         * @param address - The account address to update.
         * @param nonce - The nonce value to be set.
         * @returns `true` if it worked, otherwise `false`.
         * @example
         * ```javascript
         * const nonce = "0x3e8";
         * const [address] = await provider.request({ method: "eth_accounts", params: [] });
         * const result = await provider.send("evm_setAccountNonce", [address, nonce] );
         * console.log(result);
         * ```
         */
        evm_setAccountNonce(address: DATA, nonce: QUANTITY): Promise<boolean>;
        /**
         * Sets the given account's balance to the specified WEI value. Mines a new block
         * before returning.
         *
         * Warning: this will result in an invalid state tree.
         *
         * @param address - The account address to update.
         * @param balance - The balance value, in WEI, to be set.
         * @returns `true` if it worked, otherwise `false`.
         * @example
         * ```javascript
         * const balance = "0x3e8";
         * const [address] = await provider.request({ method: "eth_accounts", params: [] });
         * const result = await provider.send("evm_setAccountBalance", [address, balance] );
         * console.log(result);
         * ```
         */
        evm_setAccountBalance(address: DATA, balance: QUANTITY): Promise<boolean>;
        /**
         * Sets the given account's code to the specified data. Mines a new block
         * before returning.
         *
         * Warning: this will result in an invalid state tree.
         *
         * @param address - The account address to update.
         * @param code - The code to be set.
         * @returns `true` if it worked, otherwise `false`.
         * @example
         * ```javascript
         * const data = "0xbaddad42";
         * const [address] = await provider.request({ method: "eth_accounts", params: [] });
         * const result = await provider.send("evm_setAccountCode", [address, data] );
         * console.log(result);
         * ```
         */
        evm_setAccountCode(address: DATA, code: DATA): Promise<boolean>;
        /**
         * Sets the given account's storage slot to the specified data. Mines a new block
         * before returning.
         *
         * Warning: this will result in an invalid state tree.
         *
         * @param address - The account address to update.
         * @param slot - The storage slot that should be set.
         * @param value - The value to be set.
         * @returns `true` if it worked, otherwise `false`.
         * @example
         * ```javascript
         * const slot = "0x0000000000000000000000000000000000000000000000000000000000000005";
         * const data = "0xbaddad42";
         * const [address] = await provider.request({ method: "eth_accounts", params: [] });
         * const result = await provider.send("evm_setAccountStorageAt", [address, slot, data] );
         * console.log(result);
         * ```
         */
        evm_setAccountStorageAt(address: DATA, slot: DATA, value: DATA): Promise<boolean>;
        /**
         * Jump forward in time by the given amount of time, in seconds.
         * @param seconds - Number of seconds to jump forward in time by. Must be greater than or equal to `0`.
         * @returns Returns the total time adjustment, in seconds.
         * @example
         * ```javascript
         * const seconds = 10;
         * const timeAdjustment = await provider.send("evm_increaseTime", [seconds] );
         * console.log(timeAdjustment);
         * ```
         */
        evm_increaseTime(seconds: number | QUANTITY): Promise<number>;
        /**
         * Sets the internal clock time to the given timestamp.
         *
         * Warning: This will allow you to move *backwards* in time, which may cause
         * new blocks to appear to be mined before old blocks. This will result in
         * an invalid state.
         *
         * @param time - JavaScript timestamp (millisecond precision).
         * @returns The amount of *seconds* between the given timestamp and now.
         * @example
         * ```javascript
         * const currentDate = Date.now();
         * await new Promise(resolve => {
         *   setTimeout(async () => {
         *     const time = await provider.send("evm_setTime", [currentDate]);
         *     console.log(time); // should be about two seconds ago
         *     resolve();
         *   }, 1000);
         * });
         * ```
         */
        evm_setTime(time: number | QUANTITY | Date): Promise<number>;
        /**
         * Revert the state of the blockchain to a previous snapshot. Takes a single
         * parameter, which is the snapshot id to revert to. This deletes the given
         * snapshot, as well as any snapshots taken after (e.g.: reverting to id 0x1
         * will delete snapshots with ids 0x1, 0x2, etc.)
         *
         * @param snapshotId - The snapshot id to revert.
         * @returns `true` if a snapshot was reverted, otherwise `false`.
         *
         * @example
         * ```javascript
         * const [from, to] = await provider.send("eth_accounts");
         * const startingBalance = BigInt(await provider.send("eth_getBalance", [from] ));
         *
         * // take a snapshot
         * const snapshotId = await provider.send("evm_snapshot");
         *
         * // send value to another account (over-simplified example)
         * await provider.send("eth_subscribe", ["newHeads"] );
         * await provider.send("eth_sendTransaction", [{from, to, value: "0xffff"}] );
         *
         * // ensure balance has updated
         * const newBalance = await provider.send("eth_getBalance", [from] );
         * assert(BigInt(newBalance) < startingBalance);
         *
         * // revert the snapshot
         * const isReverted = await provider.send("evm_revert", [snapshotId] );
         * assert(isReverted);
         * console.log({isReverted: isReverted});
         *
         * // ensure balance has reverted
         * const endingBalance = await provider.send("eth_getBalance", [from] );
         * const isBalanceReverted = assert.strictEqual(BigInt(endingBalance), startingBalance);
         * console.log({isBalanceReverted: isBalanceReverted});
         * ```
         */
        evm_revert(snapshotId: QUANTITY): Promise<boolean>;
        /**
         * Snapshot the state of the blockchain at the current block. Takes no
         * parameters. Returns the id of the snapshot that was created. A snapshot can
         * only be reverted once. After a successful `evm_revert`, the same snapshot
         * id cannot be used again. Consider creating a new snapshot after each
         * `evm_revert` if you need to revert to the same point multiple times.
         *
         * @returns The hex-encoded identifier for this snapshot.
         *
         * @example
         * ```javascript
         * const provider = ganache.provider();
         * const [from, to] = await provider.send("eth_accounts");
         * const startingBalance = BigInt(await provider.send("eth_getBalance", [from] ));
         *
         * // take a snapshot
         * const snapshotId = await provider.send("evm_snapshot");
         *
         * // send value to another account (over-simplified example)
         * await provider.send("eth_subscribe", ["newHeads"] );
         * await provider.send("eth_sendTransaction", [{from, to, value: "0xffff"}] );
         *
         * // ensure balance has updated
         * const newBalance = await provider.send("eth_getBalance", [from] );
         * assert(BigInt(newBalance) < startingBalance);
         *
         * // revert the snapshot
         * const isReverted = await provider.send("evm_revert", [snapshotId] );
         * assert(isReverted);
         *
         * // ensure balance has reverted
         * const endingBalance = await provider.send("eth_getBalance", [from] );
         * const isBalanceReverted = assert.strictEqual(BigInt(endingBalance), startingBalance);
         * console.log({isBalanceReverted: isBalanceReverted});
         * ```
         */
        evm_snapshot(): Promise<Quantity>;
        /**
         * Adds any arbitrary account to the `personal` namespace.
         *
         * Note: accounts already known to the `personal` namespace and accounts
         * returned by `eth_accounts` cannot be re-added using this method.
         * @param address - The address of the account to add to the `personal`
         * namespace.
         * @param passphrase - The passphrase used to encrypt the account's private key.
         * NOTE: this passphrase will be needed for all `personal` namespace calls
         * that require a password.
         * @returns `true` if  the account was successfully added. `false` if the
         * account is already in the `personal` namespace.
         * @example
         * ```javascript
         * const address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
         * const passphrase = "passphrase"
         * const result = await provider.send("evm_addAccount", [address, passphrase] );
         * console.log(result);
         * ```
         */
        evm_addAccount(address: DATA, passphrase: string): Promise<boolean>;
        /**
         * Removes an account from the `personal` namespace.
         *
         * Note: accounts not known to the `personal` namespace cannot be removed
         * using this method.
         * @param address - The address of the account to remove from the `personal`
         * namespace.
         * @param passphrase - The passphrase used to decrypt the account's private key.
         * @returns `true` if the account was successfully removed. `false` if the
         * account was not in the `personal` namespace.
         * @example
         * ```javascript
         * const [address] = await provider.request({ method: "eth_accounts", params: [] });
         * const passphrase = "";
         * const result = await provider.send("evm_removeAccount", [address, passphrase] );
         * console.log(result);
         * ```
         */
        evm_removeAccount(address: DATA, passphrase: string): Promise<boolean>;
        /**
         * Resume the CPU mining process with the given number of threads.
         *
         * Note: `threads` is ignored.
         * @param threads - Number of threads to resume the CPU mining process with.
         * @returns `true`.
         * @example
         * ```javascript
         * await provider.send("miner_stop");
         * // check that eth_mining returns false
         * console.log(await provider.send("eth_mining"));
         * await provider.send("miner_start");
         * // check that eth_mining returns true
         * console.log(await provider.send("eth_mining"));
         * ```
         */
        miner_start(threads?: number): Promise<boolean>;
        /**
         * Stop the CPU mining operation.
         * @returns `true`.
         * @example
         * ```javascript
         * // check that eth_mining returns true
         * console.log(await provider.send("eth_mining"));
         * await provider.send("miner_stop");
         * // check that eth_mining returns false
         * console.log(await provider.send("eth_mining"));
         * ```
         */
        miner_stop(): Promise<boolean>;
        /**
         * Sets the default accepted gas price when mining transactions.
         * Any transactions that don't specify a gas price will use this amount.
         * Transactions that are below this limit are excluded from the mining process.
         * @param number - Default accepted gas price.
         * @returns `true`.
         * @example
         * ```javascript
         * console.log(await provider.send("miner_setGasPrice", [300000] ));
         * ```
         */
        miner_setGasPrice(number: QUANTITY): Promise<boolean>;
        /**
         * Sets the etherbase, where mining rewards will go.
         * @param address - The address where the mining rewards will go.
         * @returns `true`.
         * @example
         * ```javascript
         * const [account] = await provider.request({ method: "eth_accounts", params: [] });
         * console.log(await provider.send("miner_setEtherbase", [account] ));
         * ```
         */
        miner_setEtherbase(address: DATA): Promise<boolean>;
        /**
         * Set the extraData block header field a miner can include.
         * @param extra - The `extraData` to include.
         * @returns If successfully set returns `true`, otherwise returns an error.
         * @example
         * ```javascript
         * console.log(await provider.send("miner_setExtra", ["0x0"] ));
         * ```
         */
        miner_setExtra(extra: DATA): Promise<boolean>;
        /**
         * Returns the current client version.
         * @returns The current client version.
         * @example
         * ```javascript
         * console.log(await provider.send("web3_clientVersion"));
         * ```
         */
        web3_clientVersion(): Promise<string>;
        /**
         * Returns Keccak-256 (not the standardized SHA3-256) of the given data.
         * @param data - the data to convert into a SHA3 hash.
         * @returns The SHA3 result of the given string.
         * @example
         * ```javascript
         * const data = "0xabcdef0123456789";
         * const sha3 = await provider.send("web3_sha3", [data] );
         * console.log(sha3);
         * ```
         */
        web3_sha3(data: DATA): Promise<Data>;
        /**
         * Returns the current network id.
         * @returns The current network id. This value should NOT be JSON-RPC
         * Quantity/Data encoded.
         * @example
         * ```javascript
         * console.log(await provider.send("net_version"));
         * ```
         */
        net_version(): Promise<string>;
        /**
         * Returns `true` if client is actively listening for network connections.
         * @returns `true` when listening, otherwise `false`.
         * @example
         * ```javascript
         * console.log(await provider.send("net_listening"));
         * ```
         */
        net_listening(): Promise<boolean>;
        /**
         * Returns number of peers currently connected to the client.
         * @returns Number of connected peers.
         * @example
         * ```javascript
         * console.log(await provider.send("net_peerCount"));
         * ```
         */
        net_peerCount(): Promise<Quantity>;
        /**
         * Generates and returns an estimate of how much gas is necessary to allow the
         * transaction to complete. The transaction will not be added to the
         * blockchain. Note that the estimate may be significantly more than the
         * amount of gas actually used by the transaction, for a variety of reasons
         * including EVM mechanics and node performance.
         *
         * Transaction call object:
         * * `from`: `DATA`, 20 bytes (optional) - The address the transaction is sent from.
         * * `to`: `DATA`, 20 bytes - The address the transaction is sent to.
         * * `gas`: `QUANTITY` (optional) - Integer of the maximum gas allowance for the transaction.
         * * `gasPrice`: `QUANTITY` (optional) - Integer of the price of gas in wei.
         * * `value`: `QUANTITY` (optional) - Integer of the value in wei.
         * * `data`: `DATA` (optional) - Hash of the method signature and the ABI encoded parameters.
         *
         * @param transaction - The transaction call object as seen in source.
         * @param blockNumber - Integer block number, or the string "latest", "earliest"
         *  or "pending".
         *
         * @returns The amount of gas used.
         *
         * @example
         * ```javascript
         * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
         * const gasEstimate = await provider.request({ method: "eth_estimateGas", params: [{ from, to }, "latest" ] });
         * console.log(gasEstimate);
         * ```
         */
        eth_estimateGas(transaction: Ethereum.Transaction, blockNumber?: QUANTITY | Ethereum.Tag): Promise<Quantity>;
        /**
         * Returns the current ethereum protocol version.
         * @returns The current ethereum protocol version.
         * @example
         * ```javascript
         * const version = await provider.request({ method: "eth_protocolVersion", params: [] });
         * console.log(version);
         * ```
         */
        eth_protocolVersion(): Promise<Data>;
        /**
         * Returns an object containing data about the sync status or `false` when not syncing.
         *
         * @returns An object with sync status data or `false`, when not syncing.
         *
         * * `startingBlock`: \{bigint\} The block at which the import started (will
         *     only be reset, after the sync reached his head).
         * * `currentBlock`: \{bigint\} The current block, same as `eth_blockNumber`.
         * * `highestBlock`: \{bigint\} The estimated highest block.
         *
         * @example
         * ```javascript
         * const result = await provider.request({ method: "eth_syncing", params: [] });
         * console.log(result);
         * ```
         */
        eth_syncing(): Promise<boolean>;
        /**
         * Returns the client coinbase address.
         * @returns The current coinbase address.
         * @example
         * ```javascript
         * const coinbaseAddress = await provider.request({ method: "eth_coinbase" });
         * console.log(coinbaseAddress);
         * ```
         */
        eth_coinbase(): Promise<Address>;
        /**
         * Returns information about a block by block number.
         * @param number - Integer of a block number, or the string "earliest", "latest" or "pending", as in the
         * default block parameter.
         * @param transactions - If `true` it returns the full transaction objects, if `false` only the hashes of the
         * transactions.
         * @returns The block, `null` if the block doesn't exist.
         *
         * * `hash`: `DATA`, 32 Bytes - Hash of the block. `null` when pending.
         * * `parentHash`: `DATA`, 32 Bytes - Hash of the parent block.
         * * `sha3Uncles`: `DATA`, 32 Bytes - SHA3 of the uncles data in the block.
         * * `miner`: `DATA`, 20 Bytes -  Address of the miner.
         * * `stateRoot`: `DATA`, 32 Bytes - The root of the state trie of the block.
         * * `transactionsRoot`: `DATA`, 32 Bytes - The root of the transaction trie of the block.
         * * `receiptsRoot`: `DATA`, 32 Bytes - The root of the receipts trie of the block.
         * * `logsBloom`: `DATA`, 256 Bytes - The bloom filter for the logs of the block. `null` when pending.
         * * `difficulty`: `QUANTITY` - Integer of the difficulty of this block.
         * * `number`: `QUANTITY` - The block number. `null` when pending.
         * * `gasLimit`: `QUANTITY` - The maximum gas allowed in the block.
         * * `gasUsed`: `QUANTITY` - Total gas used by all transactions in the block.
         * * `timestamp`: `QUANTITY` - The unix timestamp for when the block was collated.
         * * `extraData`: `DATA` - Extra data for the block.
         * * `mixHash`: `DATA`, 256 Bytes - Hash identifier for the block.
         * * `nonce`: `DATA`, 8 Bytes - Hash of the generated proof-of-work. `null` when pending.
         * * `totalDifficulty`: `QUANTITY` - Integer of the total difficulty of the chain until this block.
         * * `size`: `QUANTITY` - Integer the size of the block in bytes.
         * * `transactions`: `Array` - Array of transaction objects or 32 Bytes transaction hashes depending on the last parameter.
         * * `uncles`: `Array` - Array of uncle hashes.
         *
         * @example
         * ```javascript
         * const block = await provider.request({ method: "eth_getBlockByNumber", params: ["0x0", false] });
         * console.log(block);
         * ```
         */
        eth_getBlockByNumber<IncludeTransactions extends boolean = false>(number: QUANTITY | Ethereum.Tag, transactions?: IncludeTransactions): Promise<Ethereum.Block<IncludeTransactions, "private"> | null>;
        /**
         * Returns the details for the account at the specified address and block
         * number, the account's Merkle proof, and the storage values for the
         * specified storage keys with their Merkle-proofs.
         *
         * @param address - Address of the account
         * @param storageKeys - Array of storage keys to be proofed.
         * @param blockNumber - A block number, or the string "earliest", "latest", or
         * "pending".
         * @returns An object containing the details for the account at the specified
         * address and block number, the account's Merkle proof, and the
         * storage-values for the specified storage keys with their Merkle-proofs:
         * * `balance`: `QUANTITY` - the balance of the account.
         * * `codeHash`: `DATA` - 32 Bytes - hash of the account. A simple account
         *   without code will return
         *   `"0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"`
         * * `nonce`: `QUANTITY` - the nonce of the account.
         * * `storageHash`: `DATA` - 32 Bytes - SHA3 of the StorageRoot. All storage
         *   will deliver a MerkleProof starting with this rootHash.
         * * `accountProof`: `Array` - Array of rlp-serialized MerkleTree-Nodes,
         *   starting with the stateRoot-NODE, following the path of the SHA3
         *   (address) as key.
         * * `storageProof`: `Array` - Array of storage entries as requested. Each
         *   entry is an object with the following properties:
         *   * `key`: `DATA` - the requested storage key.
         *   * `value`: `QUANTITY` - the storage value.
         *   * `proof`: `Array` - Array of rlp-serialized MerkleTree-Nodes, starting
         *     with the storageHash-Node, following the path of the SHA3 (key) as
         *     path.
         * @example
         * ```javascript
         * // Simple.sol
         * // // SPDX-License-Identifier: MIT
         * //  pragma solidity ^0.7.4;
         * //
         * //  contract Simple {
         * //      uint256 public value;
         * //      constructor() payable {
         * //          value = 5;
         * //      }
         * //  }
         * const simpleSol = "0x6080604052600560008190555060858060196000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80633fa4f24514602d575b600080fd5b60336049565b6040518082815260200191505060405180910390f35b6000548156fea26469706673582212200897f7766689bf7a145227297912838b19bcad29039258a293be78e3bf58e20264736f6c63430007040033";
         * const [from] = await provider.request({ method: "eth_accounts", params: [] });
         * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
         * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, gas: "0x5b8d80", data: simpleSol }] });
         * const txReceipt = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] });
         * const proof = await provider.request({ method: "eth_getProof", params: [txReceipt.contractAddress, ["0x0", "0x1"], "latest"] });
         * console.log(proof);
         * ```
         */
        eth_getProof(address: DATA, storageKeys: DATA[], blockNumber?: QUANTITY | Ethereum.Tag): Promise<Ethereum.AccountProof<"private">>;
        /**
         * Returns information about a block by block hash.
         * @param hash - Hash of a block.
         * @param transactions - If `true` it returns the full transaction objects, if `false` only the hashes of the
         * transactions.
         * @returns The block, `null` if the block doesn't exist.
         *
         * * `hash`: `DATA`, 32 Bytes - Hash of the block. `null` when pending.
         * * `parentHash`: `DATA`, 32 Bytes - Hash of the parent block.
         * * `sha3Uncles`: `DATA`, 32 Bytes - SHA3 of the uncles data in the block.
         * * `miner`: `DATA`, 20 Bytes -  Address of the miner.
         * * `stateRoot`: `DATA`, 32 Bytes - The root of the state trie of the block.
         * * `transactionsRoot`: `DATA`, 32 Bytes - The root of the transaction trie of the block.
         * * `receiptsRoot`: `DATA`, 32 Bytes - The root of the receipts trie of the block.
         * * `logsBloom`: `DATA`, 256 Bytes - The bloom filter for the logs of the block. `null` when pending.
         * * `difficulty`: `QUANTITY` - Integer of the difficulty of this block.
         * * `number`: `QUANTITY` - The block number. `null` when pending.
         * * `gasLimit`: `QUANTITY` - The maximum gas allowed in the block.
         * * `gasUsed`: `QUANTITY` - Total gas used by all transactions in the block.
         * * `timestamp`: `QUANTITY` - The unix timestamp for when the block was collated.
         * * `extraData`: `DATA` - Extra data for the block.
         * * `mixHash`: `DATA`, 256 Bytes - Hash identifier for the block.
         * * `nonce`: `DATA`, 8 Bytes - Hash of the generated proof-of-work. `null` when pending.
         * * `totalDifficulty`: `QUANTITY` - Integer of the total difficulty of the chain until this block.
         * * `size`: `QUANTITY` - Integer the size of the block in bytes.
         * * `transactions`: `Array` - Array of transaction objects or 32 Bytes transaction hashes depending on the last parameter.
         * * `uncles`: `Array` - Array of uncle hashes.
         *
         * @example
         * ```javascript
         * // Simple.sol
         * // // SPDX-License-Identifier: MIT
         * //  pragma solidity ^0.7.4;
         * //
         * //  contract Simple {
         * //      uint256 public value;
         * //      constructor() payable {
         * //          value = 5;
         * //      }
         * //  }
         * const simpleSol = "0x6080604052600560008190555060858060196000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80633fa4f24514602d575b600080fd5b60336049565b6040518082815260200191505060405180910390f35b6000548156fea26469706673582212200897f7766689bf7a145227297912838b19bcad29039258a293be78e3bf58e20264736f6c63430007040033";
         * const [from] = await provider.request({ method: "eth_accounts", params: [] });
         * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
         * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, gas: "0x5b8d80", data: simpleSol }] });
         * const txReceipt = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] });
         * const block = await provider.request({ method: "eth_getBlockByHash", params: [txReceipt.blockHash, true] });
         * console.log(block);
         * ```
         */
        eth_getBlockByHash<IncludeTransactions extends boolean = false>(hash: DATA, transactions?: IncludeTransactions): Promise<Ethereum.Block<IncludeTransactions, "private"> | null>;
        /**
         * Returns the number of transactions in a block from a block matching the given block number.
         * @param number - Integer of a block number, or the string "earliest", "latest" or "pending", as in the
         * default block parameter.
         * @returns Integer of the number of transactions in the block.
         * @example
         * ```javascript
         * const txCount = await provider.request({ method: "eth_getBlockTransactionCountByNumber", params: ["0x0"] });
         * console.log(txCount);
         * ```
         */
        eth_getBlockTransactionCountByNumber(blockNumber: QUANTITY | Ethereum.Tag): Promise<Quantity>;
        /**
         * Returns the number of transactions in a block from a block matching the given block hash.
         * @param hash - Hash of a block.
         * @returns Number of transactions in the block.
         * @example
         * ```javascript
         * // Simple.sol
         * // // SPDX-License-Identifier: MIT
         * //  pragma solidity ^0.7.4;
         * //
         * //  contract Simple {
         * //      uint256 public value;
         * //      constructor() payable {
         * //          value = 5;
         * //      }
         * //  }
         * const simpleSol = "0x6080604052600560008190555060858060196000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80633fa4f24514602d575b600080fd5b60336049565b6040518082815260200191505060405180910390f35b6000548156fea26469706673582212200897f7766689bf7a145227297912838b19bcad29039258a293be78e3bf58e20264736f6c63430007040033";
         * const [from] = await provider.request({ method: "eth_accounts", params: [] });
         * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
         * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, gas: "0x5b8d80", data: simpleSol }] });
         * const txReceipt = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] });
         * const txCount = await provider.request({ method: "eth_getBlockTransactionCountByHash", params: [txReceipt.blockHash] });
         * console.log(txCount);
         * ```
         */
        eth_getBlockTransactionCountByHash(hash: DATA): Promise<Quantity>;
        /**
         * Returns a list of available compilers.
         * @returns List of available compilers.
         * @example
         * ```javascript
         * const compilers = await provider.send("eth_getCompilers");
         * console.log(compilers);
         * ```
         */
        eth_getCompilers(): Promise<string[]>;
        /**
         * Returns information about a transaction by block hash and transaction index position.
         * @param hash - Hash of a block.
         * @param index - Integer of the transaction index position.
         * @returns The transaction object or `null` if no transaction was found.
         *
         * * `hash`: `DATA`, 32 Bytes - The transaction hash.
         * * `nonce`: `QUANTITY` - The number of transactions made by the sender prior to this one.
         * * `blockHash`: `DATA`, 32 Bytes - The hash of the block the transaction is in. `null` when pending.
         * * `blockNumber`: `QUANTITY` - The number of the block the transaction is in. `null` when pending.
         * * `transactionIndex`: `QUANTITY` - The index position of the transaction in the block.
         * * `from`: `DATA`, 20 Bytes - The address the transaction is sent from.
         * * `to`: `DATA`, 20 Bytes - The address the transaction is sent to.
         * * `value`: `QUANTITY` - The value transferred in wei.
         * * `gas`: `QUANTITY` - The gas provided by the sender.
         * * `gasPrice`: `QUANTITY` - The price of gas in wei.
         * * `input`: `DATA` - The data sent along with the transaction.
         * * `v`: `QUANTITY` - ECDSA recovery id.
         * * `r`: `DATA`, 32 Bytes - ECDSA signature r.
         * * `s`: `DATA`, 32 Bytes - ECDSA signature s.
         *
         * @example
         * ```javascript
         * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
         * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
         * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to, gas: "0x5b8d80" }] });
         * const { blockHash, transactionIndex } = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] });
         *
         * const tx = await provider.request({ method: "eth_getTransactionByBlockHashAndIndex", params: [ blockHash, transactionIndex ] });
         * console.log(tx);
         * ```
         */
        eth_getTransactionByBlockHashAndIndex(hash: DATA, index: QUANTITY): Promise<Ethereum.Block.Transaction<"private"> | null>;
        /**
         * Returns information about a transaction by block number and transaction index position.
         * @param number - A block number, or the string "earliest", "latest" or "pending".
         * @param index - Integer of the transaction index position.
         * @returns The transaction object or `null` if no transaction was found.
         *
         * * `hash`: `DATA`, 32 Bytes - The transaction hash.
         * * `nonce`: `QUANTITY` - The number of transactions made by the sender prior to this one.
         * * `blockHash`: `DATA`, 32 Bytes - The hash of the block the transaction is in. `null` when pending.
         * * `blockNumber`: `QUANTITY` - The number of the block the transaction is in. `null` when pending.
         * * `transactionIndex`: `QUANTITY` - The index position of the transaction in the block.
         * * `from`: `DATA`, 20 Bytes - The address the transaction is sent from.
         * * `to`: `DATA`, 20 Bytes - The address the transaction is sent to.
         * * `value`: `QUANTITY` - The value transferred in wei.
         * * `gas`: `QUANTITY` - The gas provided by the sender.
         * * `gasPrice`: `QUANTITY` - The price of gas in wei.
         * * `input`: `DATA` - The data sent along with the transaction.
         * * `v`: `QUANTITY` - ECDSA recovery id.
         * * `r`: `DATA`, 32 Bytes - ECDSA signature r.
         * * `s`: `DATA`, 32 Bytes - ECDSA signature s.
         *
         * @example
         * ```javascript
         * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
         * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
         * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to, gas: "0x5b8d80" }] });
         * const { transactionIndex } = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] });
         *
         * const tx = await provider.request({ method: "eth_getTransactionByBlockNumberAndIndex", params: [ "latest", transactionIndex ] });
         * console.log(tx);
         * ```
         */
        eth_getTransactionByBlockNumberAndIndex(number: QUANTITY | Ethereum.Tag, index: QUANTITY): Promise<Ethereum.Block.Transaction<"private"> | null>;
        /**
         * Returns the number of uncles in a block from a block matching the given block hash.
         * @param hash - Hash of a block.
         * @returns The number of uncles in a block.
         * @example
         * ```javascript
         * const blockHash = await provider.send("eth_getBlockByNumber", ["latest"] );
         * const uncleCount = await provider.send("eth_getUncleCountByBlockHash", [blockHash] );
         * console.log(uncleCount);
         * ```
         */
        eth_getUncleCountByBlockHash(hash: DATA): Promise<Quantity>;
        /**
         * Returns the number of uncles in a block from a block matching the given block hash.
         * @param blockNumber - A block number, or the string "earliest", "latest" or "pending".
         * @returns The number of uncles in a block.
         * @example
         * ```javascript
         * const uncleCount = await provider.send("eth_getUncleCountByBlockNumber", ["latest"] );
         * console.log(uncleCount);
         * ```
         */
        eth_getUncleCountByBlockNumber(blockNumber: QUANTITY | Ethereum.Tag): Promise<Quantity>;
        /**
         * Returns information about a uncle of a block by hash and uncle index position.
         *
         * @param hash - Hash of a block.
         * @param index - The uncle's index position.
         * @returns A block object or `null` when no block is found.
         *
         * * `hash`: `DATA`, 32 Bytes - Hash of the block. `null` when pending.
         * * `parentHash`: `DATA`, 32 Bytes - Hash of the parent block.
         * * `sha3Uncles`: `DATA`, 32 Bytes - SHA3 of the uncles data in the block.
         * * `miner`: `DATA`, 20 Bytes -  Address of the miner.
         * * `stateRoot`: `DATA`, 32 Bytes - The root of the state trie of the block.
         * * `transactionsRoot`: `DATA`, 32 Bytes - The root of the transaction trie of the block.
         * * `receiptsRoot`: `DATA`, 32 Bytes - The root of the receipts trie of the block.
         * * `logsBloom`: `DATA`, 256 Bytes - The bloom filter for the logs of the block. `null` when pending.
         * * `difficulty`: `QUANTITY` - Integer of the difficulty of this block.
         * * `number`: `QUANTITY` - The block number. `null` when pending.
         * * `gasLimit`: `QUANTITY` - The maximum gas allowed in the block.
         * * `gasUsed`: `QUANTITY` - Total gas used by all transactions in the block.
         * * `timestamp`: `QUANTITY` - The unix timestamp for when the block was collated.
         * * `extraData`: `DATA` - Extra data for the block.
         * * `mixHash`: `DATA`, 256 Bytes - Hash identifier for the block.
         * * `nonce`: `DATA`, 8 Bytes - Hash of the generated proof-of-work. `null` when pending.
         * * `totalDifficulty`: `QUANTITY` - Integer of the total difficulty of the chain until this block.
         * * `size`: `QUANTITY` - Integer the size of the block in bytes.
         * * `uncles`: `Array` - Array of uncle hashes.
         *
         * **NOTE: **The return does not contain a list of transactions in the uncle
         * block, to get this, make another request to `eth_getBlockByHash`.
         *
         * @example
         * ```javascript
         * const blockHash = await provider.send("eth_getBlockByNumber", ["latest"] );
         * const block = await provider.send("eth_getUncleByBlockHashAndIndex", [blockHash, "0x0"] );
         * console.log(block);
         * ```
         */
        eth_getUncleByBlockHashAndIndex(hash: DATA, index: QUANTITY): Promise<Omit<{
            hash: string;
            size: string;
            transactions: ({
                hash: string;
                type?: string;
                nonce: string;
                blockHash: string;
                blockNumber: string;
                transactionIndex: string;
                from: string;
                to: string;
                value: string;
                gas: string;
                gasPrice: string;
                input: string;
                v: string;
                r: string;
                s: string;
            } | {
                hash: string;
                type: string;
                chainId: string;
                nonce: string;
                blockHash: string;
                blockNumber: string;
                transactionIndex: string;
                from: string;
                to: string;
                value: string;
                gas: string;
                gasPrice: string;
                input: string;
                accessList: {
                    address: string;
                    storageKeys: string[];
                }[];
                v: string;
                r: string;
                s: string;
            } | {
                hash: string;
                type: string;
                chainId: string;
                nonce: string;
                blockHash: string;
                blockNumber: string;
                transactionIndex: string;
                from: string;
                to: string;
                value: string;
                maxPriorityFeePerGas: string;
                maxFeePerGas: string;
                gasPrice: string;
                gas: string;
                input: string;
                accessList: {
                    address: string;
                    storageKeys: string[];
                }[];
                v: string;
                r: string;
                s: string;
            } | {
                type?: string;
                nonce: string;
                blockNumber: null;
                gasPrice: string;
                hash: string;
                gas: string;
                to: string;
                value: string;
                v: string;
                r: string;
                s: string;
                from: string;
                blockHash: null;
                input: string;
                transactionIndex: null;
            })[];
            uncles: string[];
            parentHash: string;
            sha3Uncles: string;
            miner: string;
            stateRoot: string;
            transactionsRoot: string;
            receiptsRoot: string;
            logsBloom: string;
            difficulty: string;
            totalDifficulty: string;
            number: string;
            gasLimit: string;
            gasUsed: string;
            timestamp: string;
            extraData: string;
            mixHash: string;
            nonce: string;
            baseFeePerGas?: string;
        }, "transactions">>;
        /**
         * Returns information about a uncle of a block by hash and uncle index position.
         *
         * @param blockNumber - A block number, or the string "earliest", "latest" or "pending".
         * @param uncleIndex - The uncle's index position.
         * @returns A block object or `null` when no block is found.
         *
         * * `hash`: `DATA`, 32 Bytes - Hash of the block. `null` when pending.
         * * `parentHash`: `DATA`, 32 Bytes - Hash of the parent block.
         * * `sha3Uncles`: `DATA`, 32 Bytes - SHA3 of the uncles data in the block.
         * * `miner`: `DATA`, 20 Bytes -  Address of the miner.
         * * `stateRoot`: `DATA`, 32 Bytes - The root of the state trie of the block.
         * * `transactionsRoot`: `DATA`, 32 Bytes - The root of the transaction trie of the block.
         * * `receiptsRoot`: `DATA`, 32 Bytes - The root of the receipts trie of the block.
         * * `logsBloom`: `DATA`, 256 Bytes - The bloom filter for the logs of the block. `null` when pending.
         * * `difficulty`: `QUANTITY` - Integer of the difficulty of this block.
         * * `number`: `QUANTITY` - The block number. `null` when pending.
         * * `gasLimit`: `QUANTITY` - The maximum gas allowed in the block.
         * * `gasUsed`: `QUANTITY` - Total gas used by all transactions in the block.
         * * `timestamp`: `QUANTITY` - The unix timestamp for when the block was collated.
         * * `extraData`: `DATA` - Extra data for the block.
         * * `mixHash`: `DATA`, 256 Bytes - Hash identifier for the block.
         * * `nonce`: `DATA`, 8 Bytes - Hash of the generated proof-of-work. `null` when pending.
         * * `totalDifficulty`: `QUANTITY` - Integer of the total difficulty of the chain until this block.
         * * `size`: `QUANTITY` - Integer the size of the block in bytes.
         * * `uncles`: `Array` - Array of uncle hashes.
         *
         * * **NOTE: **The return does not contain a list of transactions in the uncle
         * block, to get this, make another request to `eth_getBlockByHash`.
         *
         * @example
         * ```javascript
         * const block = await provider.send("eth_getUncleByBlockNumberAndIndex", ["latest", "0x0"] );
         * console.log(block);
         * ```
         */
        eth_getUncleByBlockNumberAndIndex(blockNumber: QUANTITY | Ethereum.Tag, uncleIndex: QUANTITY): Promise<Omit<{
            hash: string;
            size: string;
            transactions: ({
                hash: string;
                type?: string;
                nonce: string;
                blockHash: string;
                blockNumber: string;
                transactionIndex: string;
                from: string;
                to: string;
                value: string;
                gas: string;
                gasPrice: string;
                input: string;
                v: string;
                r: string;
                s: string;
            } | {
                hash: string;
                type: string;
                chainId: string;
                nonce: string;
                blockHash: string;
                blockNumber: string;
                transactionIndex: string;
                from: string;
                to: string;
                value: string;
                gas: string;
                gasPrice: string;
                input: string;
                accessList: {
                    address: string;
                    storageKeys: string[];
                }[];
                v: string;
                r: string;
                s: string;
            } | {
                hash: string;
                type: string;
                chainId: string;
                nonce: string;
                blockHash: string;
                blockNumber: string;
                transactionIndex: string;
                from: string;
                to: string;
                value: string;
                maxPriorityFeePerGas: string;
                maxFeePerGas: string;
                gasPrice: string;
                gas: string;
                input: string;
                accessList: {
                    address: string;
                    storageKeys: string[];
                }[];
                v: string;
                r: string;
                s: string;
            } | {
                type?: string;
                nonce: string;
                blockNumber: null;
                gasPrice: string;
                hash: string;
                gas: string;
                to: string;
                value: string;
                v: string;
                r: string;
                s: string;
                from: string;
                blockHash: null;
                input: string;
                transactionIndex: null;
            })[];
            uncles: string[];
            parentHash: string;
            sha3Uncles: string;
            miner: string;
            stateRoot: string;
            transactionsRoot: string;
            receiptsRoot: string;
            logsBloom: string;
            difficulty: string;
            totalDifficulty: string;
            number: string;
            gasLimit: string;
            gasUsed: string;
            timestamp: string;
            extraData: string;
            mixHash: string;
            nonce: string;
            baseFeePerGas?: string;
        }, "transactions">>;
        /**
         * Returns: An Array with the following elements
         * 1: `DATA`, 32 Bytes - current block header pow-hash
         * 2: `DATA`, 32 Bytes - the seed hash used for the DAG.
         * 3: `DATA`, 32 Bytes - the boundary condition ("target"), 2^256 / difficulty.
         *
         * @returns The hash of the current block, the seedHash, and the boundary condition to be met ("target").
         * @example
         * ```javascript
         * console.log(await provider.send("eth_getWork", [] ));
         * ```
         */
        eth_getWork(): Promise<[] | [string, string, string]>;
        /**
         * Used for submitting a proof-of-work solution.
         *
         * @param nonce - The nonce found (64 bits).
         * @param powHash - The header's pow-hash (256 bits).
         * @param digest - The mix digest (256 bits).
         * @returns `true` if the provided solution is valid, otherwise `false`.
         * @example
         * ```javascript
         * const nonce = "0xe0df4bd14ab39a71";
         * const powHash = "0x0000000000000000000000000000000000000000000000000000000000000001";
         * const digest = "0xb2222a74119abd18dbcb7d1f661c6578b7bbeb4984c50e66ed538347f606b971";
         * const result = await provider.request({ method: "eth_submitWork", params: [nonce, powHash, digest] });
         * console.log(result);
         * ```
         */
        eth_submitWork(nonce: DATA, powHash: DATA, digest: DATA): Promise<boolean>;
        /**
         * Used for submitting mining hashrate.
         *
         * @param hashRate - A hexadecimal string representation (32 bytes) of the hash rate.
         * @param clientID - A random hexadecimal(32 bytes) ID identifying the client.
         * @returns `true` if submitting went through successfully and `false` otherwise.
         * @example
         * ```javascript
         * const hashRate = "0x0000000000000000000000000000000000000000000000000000000000000001";
         * const clientId = "0xb2222a74119abd18dbcb7d1f661c6578b7bbeb4984c50e66ed538347f606b971";
         * const result = await provider.request({ method: "eth_submitHashrate", params: [hashRate, clientId] });
         * console.log(result);
         * ```
         */
        eth_submitHashrate(hashRate: DATA, clientID: DATA): Promise<boolean>;
        /**
         * Returns `true` if client is actively mining new blocks.
         * @returns returns `true` if the client is mining, otherwise `false`.
         * @example
         * ```javascript
         * const isMining = await provider.request({ method: "eth_mining", params: [] });
         * console.log(isMining);
         * ```
         */
        eth_mining(): Promise<boolean>;
        /**
         * Returns the number of hashes per second that the node is mining with.
         * @returns Number of hashes per second.
         * @example
         * ```javascript
         * const hashrate = await provider.request({ method: "eth_hashrate", params: [] });
         * console.log(hashrate);
         * ```
         */
        eth_hashrate(): Promise<Quantity>;
        /**
         * Returns the current price per gas in wei.
         * @returns Integer of the current gas price in wei.
         * @example
         * ```javascript
         * const gasPrice = await provider.request({ method: "eth_gasPrice", params: [] });
         * console.log(gasPrice);
         * ```
         */
        eth_gasPrice(): Promise<Quantity>;
        /**
         * Returns a `maxPriorityFeePerGas` value suitable for quick transaction inclusion.
         * @returns The maxPriorityFeePerGas in wei.
         * @example
         * ```javascript
         * const suggestedTip = await provider.request({ method: "eth_maxPriorityFeePerGas", params: [] });
         * console.log(suggestedTip);
         * ```
         */
        eth_maxPriorityFeePerGas(): Promise<Quantity>;
        /**
         * Returns a list of addresses owned by client.
         * @returns Array of 20 Bytes - addresses owned by the client.
         * @example
         * ```javascript
         * const accounts = await provider.request({ method: "eth_accounts", params: [] });
         * console.log(accounts);
         * ```
         */
        eth_accounts(): Promise<string[]>;
        /**
         * Returns the number of the most recent block.
         * @returns The current block number the client is on.
         * @example
         * ```javascript
         * const blockNumber = await provider.request({ method: "eth_blockNumber" });
         * console.log(blockNumber);
         * ```
         */
        eth_blockNumber(): Promise<Quantity>;
        /**
         * Returns the currently configured chain id, a value used in
         * replay-protected transaction signing as introduced by EIP-155.
         * @returns The chain id as a string.
         * @EIP [155 – Simple replay attack protection](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md)
         *
         * @example
         * ```javascript
         * const chainId = await provider.send("eth_chainId");
         * console.log(chainId);
         * ```
         */
        eth_chainId(): Promise<Quantity>;
        /**
         * Returns the balance of the account of given address.
         * @param address - Address to check for balance.
         * @param blockNumber - Integer block number, or the string "latest", "earliest"
         *  or "pending".
         *
         * @returns Integer of the account balance in wei.
         *
         * @example
         * ```javascript
         * const accounts = await provider.request({ method: "eth_accounts", params: [] });
         * const balance = await provider.request({ method: "eth_getBalance", params: [accounts[0], "latest"] });
         * console.log(balance);
         * ```
         */
        eth_getBalance(address: DATA, blockNumber?: QUANTITY | Ethereum.Tag): Promise<Quantity>;
        /**
         * Returns code at a given address.
         *
         * @param address - Address.
         * @param blockNumber - Integer block number, or the string "latest", "earliest" or "pending".
         * @returns The code from the given address.
         * @example
         * ```javascript
         * // Simple.sol
         * // // SPDX-License-Identifier: MIT
         * //  pragma solidity ^0.7.4;
         * //
         * //  contract Simple {
         * //      uint256 public value;
         * //      constructor() payable {
         * //          value = 5;
         * //      }
         * //  }
         * const simpleSol = "0x6080604052600560008190555060858060196000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80633fa4f24514602d575b600080fd5b60336049565b6040518082815260200191505060405180910390f35b6000548156fea26469706673582212200897f7766689bf7a145227297912838b19bcad29039258a293be78e3bf58e20264736f6c63430007040033";
         * const [from] = await provider.request({ method: "eth_accounts", params: [] });
         * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
         * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, gas: "0x5b8d80", data: simpleSol }] });
         * const txReceipt = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] });
         * const code = await provider.request({ method: "eth_getCode", params: [txReceipt.contractAddress, "latest"] });
         * console.log(code);
         * ```
         */
        eth_getCode(address: DATA, blockNumber?: QUANTITY | Ethereum.Tag): Promise<Data>;
        /**
         * Returns the value from a storage position at a given address.
         * @param address - Address of the storage.
         * @param position - Integer of the position in the storage.
         * @param blockNumber - Integer block number, or the string "latest", "earliest"
         *  or "pending".
         * @returns The value in storage at the requested position.
         * @example
         * ```javascript
         * // Simple.sol
         * // // SPDX-License-Identifier: MIT
         * //  pragma solidity ^0.7.4;
         * //
         * //  contract Simple {
         * //      uint256 public value;
         * //      constructor() payable {
         * //          value = 5;
         * //      }
         * //  }
         * const simpleSol = "0x6080604052600560008190555060858060196000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80633fa4f24514602d575b600080fd5b60336049565b6040518082815260200191505060405180910390f35b6000548156fea26469706673582212200897f7766689bf7a145227297912838b19bcad29039258a293be78e3bf58e20264736f6c63430007040033";
         * const [from] = await provider.request({ method: "eth_accounts", params: [] });
         * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
         * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, gas: "0x5b8d80", data: simpleSol }] });
         * const txReceipt = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] });
         * const storageValue = await provider.request({ method: "eth_getStorageAt", params: [txReceipt.contractAddress, "0x0", "latest"] });
         * console.log(storageValue);
         * ```
         */
        eth_getStorageAt(address: DATA, position: QUANTITY, blockNumber?: QUANTITY | Ethereum.Tag): Promise<Data>;
        /**
         * Returns the information about a transaction requested by transaction hash.
         *
         * @param transactionHash - Hash of a transaction.
         * @returns The transaction object or `null` if no transaction was found.
         *
         * * `hash`: `DATA`, 32 Bytes - The transaction hash.
         * * `nonce`: `QUANTITY` - The number of transactions made by the sender prior to this one.
         * * `blockHash`: `DATA`, 32 Bytes - The hash of the block the transaction is in. `null` when pending.
         * * `blockNumber`: `QUANTITY` - The number of the block the transaction is in. `null` when pending.
         * * `transactionIndex`: `QUANTITY` - The index position of the transaction in the block.
         * * `from`: `DATA`, 20 Bytes - The address the transaction is sent from.
         * * `to`: `DATA`, 20 Bytes - The address the transaction is sent to.
         * * `value`: `QUANTITY` - The value transferred in wei.
         * * `gas`: `QUANTITY` - The gas provided by the sender.
         * * `gasPrice`: `QUANTITY` - The price of gas in wei.
         * * `input`: `DATA` - The data sent along with the transaction.
         * * `v`: `QUANTITY` - ECDSA recovery id.
         * * `r`: `DATA`, 32 Bytes - ECDSA signature r.
         * * `s`: `DATA`, 32 Bytes - ECDSA signature s.
         *
         * @example
         * ```javascript
         * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
         * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
         * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to, gas: "0x5b8d80" }] });
         *
         * const tx = await provider.request({ method: "eth_getTransactionByHash", params: [ txHash ] });
         * console.log(tx);
         * ```
         */
        eth_getTransactionByHash(transactionHash: DATA): Promise<Ethereum.Block.Transaction<"private"> | Ethereum.Pool.Transaction<"private"> | null>;
        /**
         * Returns the receipt of a transaction by transaction hash.
         *
         * Note: The receipt is not available for pending transactions.
         *
         * @param transactionHash - Hash of a transaction.
         * @returns Returns the receipt of a transaction by transaction hash.
         * @example
         * ```javascript
         * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
         * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
         * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to, gas: "0x5b8d80" }] });
         *
         * const txReceipt = await provider.request({ method: "eth_getTransactionReceipt", params: [ txHash ] });
         * console.log(txReceipt);
         * ```
         */
        eth_getTransactionReceipt(transactionHash: DATA): Promise<Ethereum.Transaction.Receipt<"private">>;
        /**
         * Creates new message call transaction or a contract creation, if the data field contains code.
         *
         * Transaction call object:
         * * `from`: `DATA`, 20 bytes (optional) - The address the transaction is sent from.
         * * `to`: `DATA`, 20 bytes - The address the transaction is sent to.
         * * `gas`: `QUANTITY` (optional) - Integer of the maximum gas allowance for the transaction.
         * * `gasPrice`: `QUANTITY` (optional) - Integer of the price of gas in wei.
         * * `value`: `QUANTITY` (optional) - Integer of the value in wei.
         * * `data`: `DATA` (optional) - Hash of the method signature and the ABI encoded parameters.
         *
         * @param transaction - The transaction call object as seen in source.
         * @returns The transaction hash.
         * @example
         * ```javascript
         * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
         * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
         * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to, gas: "0x5b8d80" }] });
         * console.log(txHash);
         * ```
         */
        eth_sendTransaction(transaction: Ethereum.Transaction): Promise<Data>;
        /**
         * Signs a transaction that can be submitted to the network at a later time using `eth_sendRawTransaction`.
         *
         * Transaction call object:
         * * `from`: `DATA`, 20 bytes (optional) - The address the transaction is sent from.
         * * `to`: `DATA`, 20 bytes - The address the transaction is sent to.
         * * `gas`: `QUANTITY` (optional) - Integer of the maximum gas allowance for the transaction.
         * * `gasPrice`: `QUANTITY` (optional) - Integer of the price of gas in wei.
         * * `value`: `QUANTITY` (optional) - Integer of the value in wei.
         * * `data`: `DATA` (optional) - Hash of the method signature and the ABI encoded parameters.
         *
         * @param transaction - The transaction call object as seen in source.
         * @returns The raw, signed transaction.
         * @example
         * ```javascript
         * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
         * const signedTx = await provider.request({ method: "eth_signTransaction", params: [{ from, to }] });
         * console.log(signedTx)
         * ```
         */
        eth_signTransaction(transaction: Ethereum.Transaction): Promise<Data>;
        /**
         * Creates new message call transaction or a contract creation for signed transactions.
         * @param transaction - The signed transaction data.
         * @returns The transaction hash.
         * @example
         * ```javascript
         * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
         * const signedTx = await provider.request({ method: "eth_signTransaction", params: [{ from, to, gas: "0x5b8d80", maxFeePerGas: "0xffffffff" }] });
         * const txHash = await provider.send("eth_sendRawTransaction", [signedTx] );
         * console.log(txHash);
         * ```
         */
        eth_sendRawTransaction(transaction: string): Promise<Data>;
        /**
         * The sign method calculates an Ethereum specific signature with:
         * `sign(keccak256("\x19Ethereum Signed Message:\n" + message.length + message)))`.
         *
         * By adding a prefix to the message makes the calculated signature
         * recognizable as an Ethereum specific signature. This prevents misuse where a malicious DApp can sign arbitrary data
         *  (e.g. transaction) and use the signature to impersonate the victim.
         *
         * Note the address to sign with must be unlocked.
         *
         * @param address - Address to sign with.
         * @param message - Message to sign.
         * @returns Signature - a hex encoded 129 byte array
         * starting with `0x`. It encodes the `r`, `s`, and `v` parameters from
         * appendix F of the [yellow paper](https://ethereum.github.io/yellowpaper/paper.pdf)
         *  in big-endian format. Bytes 0...64 contain the `r` parameter, bytes
         * 64...128 the `s` parameter, and the last byte the `v` parameter. Note
         * that the `v` parameter includes the chain id as specified in [EIP-155](https://eips.ethereum.org/EIPS/eip-155).
         * @example
         * ```javascript
         * const [account] = await provider.request({ method: "eth_accounts", params: [] });
         * const msg = "0x307866666666666666666666";
         * const signature = await provider.request({ method: "eth_sign", params: [account, msg] });
         * console.log(signature);
         * ```
         */
        eth_sign(address: DATA, message: DATA): Promise<string>;
        /**
         * Identical to eth_signTypedData_v4.
         *
         * @param address - Address of the account that will sign the messages.
         * @param typedData - Typed structured data to be signed.
         * @returns Signature. As in `eth_sign`, it is a hex encoded 129 byte array
         * starting with `0x`. It encodes the `r`, `s`, and `v` parameters from
         * appendix F of the [yellow paper](https://ethereum.github.io/yellowpaper/paper.pdf)
         *  in big-endian format. Bytes 0...64 contain the `r` parameter, bytes
         * 64...128 the `s` parameter, and the last byte the `v` parameter. Note
         * that the `v` parameter includes the chain id as specified in [EIP-155](https://eips.ethereum.org/EIPS/eip-155).
         * @EIP [712](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md)
         * @example
         * ```javascript
         * const [account] = await provider.request({ method: "eth_accounts", params: [] });
         * const typedData = {
         *  types: {
         *    EIP712Domain: [
         *      { name: 'name', type: 'string' },
         *      { name: 'version', type: 'string' },
         *      { name: 'chainId', type: 'uint256' },
         *      { name: 'verifyingContract', type: 'address' },
         *    ],
         *    Person: [
         *      { name: 'name', type: 'string' },
         *      { name: 'wallet', type: 'address' }
         *    ],
         *    Mail: [
         *      { name: 'from', type: 'Person' },
         *      { name: 'to', type: 'Person' },
         *      { name: 'contents', type: 'string' }
         *    ],
         *  },
         *  primaryType: 'Mail',
         *  domain: {
         *    name: 'Ether Mail',
         *    version: '1',
         *    chainId: 1,
         *    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
         *  },
         *  message: {
         *    from: {
         *      name: 'Cow',
         *      wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
         *    },
         *    to: {
         *      name: 'Bob',
         *      wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
         *    },
         *    contents: 'Hello, Bob!',
         *  },
         * };
         * const signature = await provider.request({ method: "eth_signTypedData", params: [account, typedData] });
         * console.log(signature);
         * ```
         */
        eth_signTypedData(address: DATA, typedData: Ethereum.TypedData): Promise<string>;
        /**
         *
         * @param address - Address of the account that will sign the messages.
         * @param typedData - Typed structured data to be signed.
         * @returns Signature. As in `eth_sign`, it is a hex encoded 129 byte array
         * starting with `0x`. It encodes the `r`, `s`, and `v` parameters from
         * appendix F of the [yellow paper](https://ethereum.github.io/yellowpaper/paper.pdf)
         *  in big-endian format. Bytes 0...64 contain the `r` parameter, bytes
         * 64...128 the `s` parameter, and the last byte the `v` parameter. Note
         * that the `v` parameter includes the chain id as specified in [EIP-155](https://eips.ethereum.org/EIPS/eip-155).
         * @EIP [712](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md)
         * @example
         * ```javascript
         * const [account] = await provider.request({ method: "eth_accounts", params: [] });
         * const typedData = {
         *  types: {
         *    EIP712Domain: [
         *      { name: 'name', type: 'string' },
         *      { name: 'version', type: 'string' },
         *      { name: 'chainId', type: 'uint256' },
         *      { name: 'verifyingContract', type: 'address' },
         *    ],
         *    Person: [
         *      { name: 'name', type: 'string' },
         *      { name: 'wallet', type: 'address' }
         *    ],
         *    Mail: [
         *      { name: 'from', type: 'Person' },
         *      { name: 'to', type: 'Person' },
         *      { name: 'contents', type: 'string' }
         *    ],
         *  },
         *  primaryType: 'Mail',
         *  domain: {
         *    name: 'Ether Mail',
         *    version: '1',
         *    chainId: 1,
         *    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
         *  },
         *  message: {
         *    from: {
         *      name: 'Cow',
         *      wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
         *    },
         *    to: {
         *      name: 'Bob',
         *      wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
         *    },
         *    contents: 'Hello, Bob!',
         *  },
         * };
         * const signature = await provider.request({ method: "eth_signTypedData_v4", params: [account, typedData] });
         * console.log(signature);
         * ```
         */
        eth_signTypedData_v4(address: DATA, typedData: Ethereum.TypedData): Promise<string>;
        /**
         * Starts a subscription to a particular event. For every event that matches
         * the subscription a JSON-RPC notification with event details and
         * subscription ID will be sent to a client.
         *
         * @param subscriptionName - Name for the subscription.
         * @returns A subscription id.
         * @example
         * ```javascript
         * const subscriptionId = await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
         * console.log(subscriptionId);
         * ```
         */
        eth_subscribe(subscriptionName: Ethereum.SubscriptionName): PromiEvent<Quantity>;
        /**
         * Starts a subscription to a particular event. For every event that matches
         * the subscription a JSON-RPC notification with event details and
         * subscription ID will be sent to a client.
         *
         * @param subscriptionName -
         * @param options - Filter options:
         *  * `address`: either an address or an array of addresses. Only logs that
         *    are created from these addresses are returned
         *  * `topics`, only logs which match the specified topics
         * @returns A subscription id.
         */
        eth_subscribe(subscriptionName: Extract<Ethereum.SubscriptionName, "logs">, options: Ethereum.SubscriptionOptions): PromiEvent<Quantity>;
        /**
         * Cancel a subscription to a particular event. Returns a boolean indicating
         * if the subscription was successfully cancelled.
         *
         * @param subscriptionId - The ID of the subscription to unsubscribe to.
         * @returns `true` if subscription was cancelled successfully, otherwise `false`.
         * @example
         * ```javascript
         * const subscriptionId = await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
         * const result = await provider.request({ method: "eth_unsubscribe", params: [subscriptionId] });
         * console.log(result);
         * ```
         */
        eth_unsubscribe(subscriptionId: Ethereum.SubscriptionId): Promise<boolean>;
        /**
         * Creates a filter in the node, to notify when a new block arrives. To check
         * if the state has changed, call `eth_getFilterChanges`.
         *
         * @returns A filter id.
         * @example
         * ```javascript
         * const filterId = await provider.request({ method: "eth_newBlockFilter", params: [] });
         * console.log(filterId);
         * ```
         */
        eth_newBlockFilter(): Promise<Quantity>;
        /**
         * Creates a filter in the node, to notify when new pending transactions
         * arrive. To check if the state has changed, call `eth_getFilterChanges`.
         *
         * @returns A filter id.
         * @example
         * ```javascript
         * const filterId = await provider.request({ method: "eth_newPendingTransactionFilter", params: [] });
         * console.log(filterId);
         * ```
         */
        eth_newPendingTransactionFilter(): Promise<Quantity>;
        /**
         * Creates a filter object, based on filter options, to notify when the state
         * changes (logs). To check if the state has changed, call
         * `eth_getFilterChanges`.
         *
         * If the from `fromBlock` or `toBlock` option are equal to "latest" the
         * filter continually append logs for whatever block is seen as latest at the
         * time the block was mined, not just for the block that was "latest" when the
         * filter was created.
         *
         * ### A note on specifying topic filters:
         * Topics are order-dependent. A transaction with a log with topics [A, B]
         * will be matched by the following topic filters:
         *  * `[]` “anything”
         *  * `[A]` “A in first position (and anything after)”
         *  * `[null, B]` “anything in first position AND B in second position (and
         * anything after)”
         *  * `[A, B]` “A in first position AND B in second position (and anything
         * after)”
         *  * `[[A, B], [A, B]]` “(A OR B) in first position AND (A OR B) in second
         * position (and anything after)”
         *
         * Filter options:
         * * `fromBlock`: `QUANTITY | TAG` (optional) - Integer block number, or the string "latest", "earliest"
         * or "pending".
         * * `toBlock`: `QUANTITY | TAG` (optional) - Integer block number, or the string "latest", "earliest"
         * or "pending".
         * * `address`: `DATA | Array` (optional) - Contract address or a list of addresses from which the logs should originate.
         * * `topics`: `Array of DATA` (optional) - Array of 32 Bytes `DATA` topics. Topics are order-dependent. Each topic can also
         * be an array of `DATA` with "or" options.
         *
         * @param filter - The filter options as seen in source.
         *
         * @returns A filter id.
         * @example
         * ```javascript
         * const filterId = await provider.request({ method: "eth_newFilter", params: [] });
         * console.log(filterId);
         * ```
         */
        eth_newFilter(filter?: Ethereum.Filter): Promise<Quantity>;
        /**
         * Polling method for a filter, which returns an array of logs, block hashes,
         * or transaction hashes, depending on the filter type, which occurred since
         * last poll.
         *
         * @param filterId - The filter id.
         * @returns An array of logs, block hashes, or transaction hashes, depending
         * on the filter type, which occurred since last poll.
         *
         * For filters created with `eth_newBlockFilter` the return are block hashes (`DATA`, 32 Bytes).
         *
         * For filters created with `eth_newPendingTransactionFilter` the return are transaction hashes (`DATA`, 32 Bytes).
         *
         * For filters created with `eth_newFilter` the return are log objects with the following parameters:
         * * `removed`: `TAG` - `true` when the log was removed, `false` if its a valid log.
         * * `logIndex`: `QUANTITY` - Integer of the log index position in the block. `null` when pending.
         * * `transactionIndex`: `QUANTITY` - Integer of the transactions index position. `null` when pending.
         * * `transactionHash`: `DATA`, 32 Bytes - Hash of the transaction where the log was. `null` when pending.
         * * `blockHash`: `DATA`, 32 Bytes - Hash of the block where the log was. `null` when pending.
         * * `blockNumber`: `QUANTITY` - The block number where the log was in. `null` when pending.
         * * `address`: `DATA`, 20 Bytes - The address from which the log originated.
         * * `data`: `DATA` - Contains one or more 32 Bytes non-indexed arguments of the log.
         * * `topics`: `Array of DATA` - Array of 0 to 4 32 Bytes `DATA` of indexed log arguments.
         *
         * @example
         * ```javascript
         * // Logs.sol
         * // // SPDX-License-Identifier: MIT
         * // pragma solidity ^0.7.4;
         * // contract Logs {
         * //   event Event(uint256 indexed first, uint256 indexed second);
         * //   constructor() {
         * //     emit Event(1, 2);
         * //   }
         * //
         * //   function logNTimes(uint8 n) public {
         * //     for (uint8 i = 0; i < n; i++) {
         * //       emit Event(i, i);
         * //     }
         * //   }
         * // }
         *
         * const logsContract = "0x608060405234801561001057600080fd5b50600260017f34e802e5ebd1f132e05852c5064046c1b535831ec52f1c4997fc6fdc4d5345b360405160405180910390a360e58061004f6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80635e19e69f14602d575b600080fd5b605960048036036020811015604157600080fd5b81019080803560ff169060200190929190505050605b565b005b60005b8160ff168160ff16101560ab578060ff168160ff167f34e802e5ebd1f132e05852c5064046c1b535831ec52f1c4997fc6fdc4d5345b360405160405180910390a38080600101915050605e565b505056fea26469706673582212201af9c13c7b00e2b628c1258d45f9f62d2aad8cd32fc32fd9515d8ad1e792679064736f6c63430007040033";
         * const [from] = await provider.send("eth_accounts");
         * const filterId = await provider.send("eth_newFilter");
         *
         * const subscriptionId = await provider.send("eth_subscribe", ["newHeads"]);
         * await provider.send("eth_sendTransaction", [{ from, data: logsContract, gas: "0x5b8d80" }] );
         *
         * const changes = await provider.request({ method: "eth_getFilterChanges", params: [filterId] });
         * console.log(changes);
         *
         * await provider.send("eth_unsubscribe", [subscriptionId]);
         * ```
         */
        eth_getFilterChanges(filterId: QUANTITY): Promise<Data[]>;
        /**
         * Uninstalls a filter with given id. Should always be called when watch is
         * no longer needed.
         *
         * @param filterId - The filter id.
         * @returns `true` if the filter was successfully uninstalled, otherwise
         * `false`.
         * @example
         * ```javascript
         * const filterId = await provider.request({ method: "eth_newFilter", params: [] });
         * const result = await provider.request({ method: "eth_uninstallFilter", params: [filterId] });
         * console.log(result);
         * ```
         */
        eth_uninstallFilter(filterId: QUANTITY): Promise<boolean>;
        /**
         * Returns an array of all logs matching filter with given id.
         *
         * @param filterId - The filter id.
         * @returns Array of log objects, or an empty array.
         * @example
         * ```javascript
         * // Logs.sol
         * // // SPDX-License-Identifier: MIT
         * // pragma solidity ^0.7.4;
         * // contract Logs {
         * //   event Event(uint256 indexed first, uint256 indexed second);
         * //   constructor() {
         * //     emit Event(1, 2);
         * //   }
         * //
         * //   function logNTimes(uint8 n) public {
         * //     for (uint8 i = 0; i < n; i++) {
         * //       emit Event(i, i);
         * //     }
         * //   }
         * // }
         *
         * const logsContract = "0x608060405234801561001057600080fd5b50600260017f34e802e5ebd1f132e05852c5064046c1b535831ec52f1c4997fc6fdc4d5345b360405160405180910390a360e58061004f6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80635e19e69f14602d575b600080fd5b605960048036036020811015604157600080fd5b81019080803560ff169060200190929190505050605b565b005b60005b8160ff168160ff16101560ab578060ff168160ff167f34e802e5ebd1f132e05852c5064046c1b535831ec52f1c4997fc6fdc4d5345b360405160405180910390a38080600101915050605e565b505056fea26469706673582212201af9c13c7b00e2b628c1258d45f9f62d2aad8cd32fc32fd9515d8ad1e792679064736f6c63430007040033";
         * const [from] = await provider.send("eth_accounts");
         * const filterId = await provider.send("eth_newFilter");
         *
         * await provider.send("eth_subscribe", ["newHeads"]);
         * await provider.send("eth_sendTransaction", [{ from, data: logsContract, gas: "0x5b8d80" }] );
         *
         * const logs = await provider.request({ method: "eth_getFilterLogs", params: [filterId] });
         * console.log(logs);
         * ```
         */
        eth_getFilterLogs(filterId: QUANTITY): Promise<Ethereum.Logs>;
        /**
         * Returns an array of all logs matching a given filter object.
         *
         * Filter options:
         * * `fromBlock`: `QUANTITY | TAG` (optional) - Integer block number, or the string "latest", "earliest"
         * or "pending".
         * * `toBlock`: `QUANTITY | TAG` (optional) - Integer block number, or the string "latest", "earliest"
         * or "pending".
         * * `address`: `DATA | Array` (optional) - Contract address or a list of addresses from which the logs should originate.
         * * `topics`: `Array of DATA` (optional) - Array of 32 Bytes `DATA` topics. Topics are order-dependent. Each topic can also
         * be an array of `DATA` with "or" options.
         * * `blockHash`: `DATA`, 32 Bytes (optional) - Hash of the block to restrict logs from. If `blockHash` is present,
         * then neither `fromBlock` or `toBlock` are allowed.
         *
         * @param filter - The filter options as seen in source.
         * @returns Array of log objects, or an empty array.
         * @example
         * ```javascript
         * // Logs.sol
         * // // SPDX-License-Identifier: MIT
         * // pragma solidity ^0.7.4;
         * // contract Logs {
         * //   event Event(uint256 indexed first, uint256 indexed second);
         * //   constructor() {
         * //     emit Event(1, 2);
         * //   }
         * //
         * //   function logNTimes(uint8 n) public {
         * //     for (uint8 i = 0; i < n; i++) {
         * //       emit Event(i, i);
         * //     }
         * //   }
         * // }
         *
         * const logsContract = "0x608060405234801561001057600080fd5b50600260017f34e802e5ebd1f132e05852c5064046c1b535831ec52f1c4997fc6fdc4d5345b360405160405180910390a360e58061004f6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80635e19e69f14602d575b600080fd5b605960048036036020811015604157600080fd5b81019080803560ff169060200190929190505050605b565b005b60005b8160ff168160ff16101560ab578060ff168160ff167f34e802e5ebd1f132e05852c5064046c1b535831ec52f1c4997fc6fdc4d5345b360405160405180910390a38080600101915050605e565b505056fea26469706673582212201af9c13c7b00e2b628c1258d45f9f62d2aad8cd32fc32fd9515d8ad1e792679064736f6c63430007040033";
         * const [from] = await provider.send("eth_accounts");
         *
         * await provider.send("eth_subscribe", ["newHeads"]);
         * const txHash = await provider.send("eth_sendTransaction", [{ from, data: logsContract, gas: "0x5b8d80" }] );
         *
         * const { contractAddress } = await provider.send("eth_getTransactionReceipt", [txHash] );
         *
         * const logs = await provider.request({ method: "eth_getLogs", params: [{ address: contractAddress }] });
         * console.log(logs);
         * ```
         */
        eth_getLogs(filter: Ethereum.LogsFilter): Promise<Ethereum.Logs>;
        /**
         * Returns the number of transactions sent from an address.
         *
         * @param address - `DATA`, 20 Bytes - The address to get number of transactions sent from
         * @param blockNumber - Integer block number, or the string "latest", "earliest"
         * or "pending".
         * @returns Number of transactions sent from this address.
         * @example
         * ```javascript
         * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
         * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
         * await provider.request({ method: "eth_sendTransaction", params: [{ from, to, gas: "0x5b8d80" }] });
         *
         * const txCount = await provider.request({ method: "eth_getTransactionCount", params: [ from, "latest" ] });
         * console.log(txCount);
         * ```
         */
        eth_getTransactionCount(address: DATA, blockNumber?: QUANTITY | Ethereum.Tag): Promise<Quantity>;
        /**
         * Executes a new message call immediately without creating a transaction on the block chain.
         *
         * Transaction call object:
         * * `from`: `DATA`, 20 bytes (optional) - The address the transaction is sent from.
         * * `to`: `DATA`, 20 bytes - The address the transaction is sent to.
         * * `gas`: `QUANTITY` (optional) - Integer of the maximum gas allowance for the transaction.
         * * `gasPrice`: `QUANTITY` (optional) - Integer of the price of gas in wei.
         * * `value`: `QUANTITY` (optional) - Integer of the value in wei.
         * * `data`: `DATA` (optional) - Hash of the method signature and the ABI encoded parameters.
         *
         * State Override object - An address-to-state mapping, where each entry specifies some
         * state to be ephemerally overridden prior to executing the call. Each address maps to an
         * object containing:
         * * `balance`: `QUANTITY` (optional) - The balance to set for the account before executing the call.
         * * `nonce`: `QUANTITY` (optional) - The nonce to set for the account before executing the call.
         * * `code`: `DATA` (optional) - The EVM bytecode to set for the account before executing the call.
         * * `state`: `OBJECT` (optional*) - Key-value mapping to override *all* slots in the account storage before executing the call.
         * * `stateDiff`: `OBJECT` (optional*) - Key-value mapping to override *individual* slots in the account storage before executing the call.
         * * *Note - `state` and `stateDiff` fields are mutually exclusive.
         * @param transaction - The transaction call object as seen in source.
         * @param blockNumber - Integer block number, or the string "latest", "earliest"
         *  or "pending".
         * @param overrides - State overrides to apply during the simulation.
         *
         * @returns The return value of executed contract.
         * @example
         * ```javascript
         * // Simple.sol
         * // // SPDX-License-Identifier: MIT
         * //  pragma solidity ^0.7.4;
         * //
         * //  contract Simple {
         * //      uint256 public value;
         * //      constructor() payable {
         * //          value = 5;
         * //      }
         * //  }
         * const simpleSol = "0x6080604052600560008190555060858060196000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80633fa4f24514602d575b600080fd5b60336049565b6040518082815260200191505060405180910390f35b6000548156fea26469706673582212200897f7766689bf7a145227297912838b19bcad29039258a293be78e3bf58e20264736f6c63430007040033";
         * const [from] = await provider.request({ method: "eth_accounts", params: [] });
         * const txObj = { from, gas: "0x5b8d80", gasPrice: "0x1dfd14000", value:"0x0", data: simpleSol };
         * const slot = "0x0000000000000000000000000000000000000000000000000000000000000005"
         * const overrides = { [from]: { balance: "0x3e8", nonce: "0x5", code: "0xbaddad42", stateDiff: { [slot]: "0x00000000000000000000000000000000000000000000000000000000baddad42"}}};
         * const result = await provider.request({ method: "eth_call", params: [txObj, "latest", overrides] });
         * console.log(result);
         * ```
         */
        eth_call(transaction: Ethereum.Call.Transaction, blockNumber?: QUANTITY | Ethereum.Tag, overrides?: Ethereum.Call.Overrides): Promise<Data>;
        /**
         * Returns a collection of historical block gas data and optional effective fee spent per unit of gas for a given percentile of block gas usage.
         *
         * @param blockCount - Range of blocks between 1 and 1024. Will return less than the requested range if not all blocks are available.
         * @param newestBlock - Highest block of the requested range.
         * @param rewardPercentiles - A monotonically increasing list of percentile values. For each block in the requested range,
         * the transactions will be sorted in ascending order by effective tip per gas and the corresponding effective tip for the percentile
         * will be determined, accounting for gas consumed.
         * @returns Transaction base fee per gas and effective priority fee per gas for the requested/supported block range
         *
         * * `oldestBlock`:  - Lowest number block of the returned range.
         * * `baseFeePerGas`:  - An array of block base fees per gas. This includes the next block after the newest of the returned range,
         * because this value can be derived from the newest block. Zeroes are returned for pre-EIP-1559 blocks.
         * * `gasUsedRatio`:  - An array of block gas used ratios. These are calculated as the ratio of `gasUsed` and `gasLimit`.
         * * `reward`:  - An array of effective priority fee per gas data points from a single block. All zeroes are returned if the
         * block is empty.
         *
         * @EIP [1559 - Fee market change](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1559.md)
         * @example
         * ```javascript
         * const [from, to] = await provider.request({ method: "eth_accounts", params: [] });
         * await provider.request({ method: "eth_sendTransaction", params: [{ from, to }] });
         * const feeHistory = await provider.request({ method: "eth_feeHistory", params: ["0x1", "0x1", [10, 100]] });
         * console.log(feeHistory);
         * ```
         */
        eth_feeHistory(blockCount: QUANTITY, newestBlock: QUANTITY | Ethereum.Tag, rewardPercentiles: number[]): Promise<Ethereum.FeeHistory<"private">>;
        /**
         * Attempt to run the transaction in the exact same manner as it was executed
         * on the network. It will replay any transaction that may have been executed
         * prior to this one before it will finally attempt to execute the transaction
         * that corresponds to the given hash.
         *
         * In addition to the hash of the transaction you may give it a secondary
         * optional argument, which specifies the options for this specific call.
         * The possible options are:
         *
         * * `disableStorage`: \{boolean\} Setting this to `true` will disable storage capture (default = `false`).
         * * `disableMemory`: \{boolean\} Setting this to `true` will disable memory capture (default = `false`).
         * * `disableStack`: \{boolean\} Setting this to `true` will disable stack capture (default = `false`).
         *
         * @param transactionHash - Hash of the transaction to trace.
         * @param options - See options in source.
         * @returns Returns the `gas`, `structLogs`, and `returnValue` for the traced transaction.
         *
         * The `structLogs` are an array of logs, which contains the following fields:
         * * `depth`: The execution depth.
         * * `error`: Information about an error, if one occurred.
         * * `gas`: The number of gas remaining.
         * * `gasCost`: The cost of gas in wei.
         * * `memory`: An array containing the contract's memory data.
         * * `op`: The current opcode.
         * * `pc`: The current program counter.
         * * `stack`: The EVM execution stack.
         * * `storage`: An object containing the contract's storage data.
         *
         * @example
         * ```javascript
         * // Simple.sol
         * // // SPDX-License-Identifier: MIT
         * //  pragma solidity ^0.7.4;
         * //
         * //  contract Simple {
         * //      uint256 public value;
         * //      constructor() payable {
         * //          value = 5;
         * //      }
         * //  }
         * const simpleSol = "0x6080604052600560008190555060858060196000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80633fa4f24514602d575b600080fd5b60336049565b6040518082815260200191505060405180910390f35b6000548156fea26469706673582212200897f7766689bf7a145227297912838b19bcad29039258a293be78e3bf58e20264736f6c63430007040033";
         * const [from] = await provider.request({ method: "eth_accounts", params: [] });
         * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
         * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, gas: "0x5b8d80", data: simpleSol }] });
         * const transactionTrace = await provider.request({ method: "debug_traceTransaction", params: [txHash] });
         * console.log(transactionTrace);
         * ```
         */
        debug_traceTransaction(transactionHash: DATA, options?: Ethereum.TraceTransactionOptions): Promise<Ethereum.TraceTransactionResult<"private">>;
        /**
         * Attempts to replay the transaction as it was executed on the network and
         * return storage data given a starting key and max number of entries to return.
         *
         * @param blockHash - Hash of a block.
         * @param transactionIndex - Integer of the transaction index position.
         * @param contractAddress - Address of the contract.
         * @param startKey - Hash of the start key for grabbing storage entries.
         * @param maxResult - Integer of maximum number of storage entries to return.
         * @returns Returns a storage object with the keys being keccak-256 hashes of the storage keys,
         * and the values being the raw, unhashed key and value for that specific storage slot. Also
         * returns a next key which is the keccak-256 hash of the next key in storage for continuous downloading.
         * @example
         * ```javascript
         * // Simple.sol
         * // // SPDX-License-Identifier: MIT
         * //  pragma solidity ^0.7.4;
         * //
         * //  contract Simple {
         * //      uint256 public value;
         * //      constructor() payable {
         * //          value = 5;
         * //      }
         * //  }
         * const simpleSol = "0x6080604052600560008190555060858060196000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80633fa4f24514602d575b600080fd5b60336049565b6040518082815260200191505060405180910390f35b6000548156fea26469706673582212200897f7766689bf7a145227297912838b19bcad29039258a293be78e3bf58e20264736f6c63430007040033";
         * const [from] = await provider.request({ method: "eth_accounts", params: [] });
         * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
         * const initialTxHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, gas: "0x5b8d80", data: simpleSol }] });
         *
         * const {contractAddress} = await provider.request({ method: "eth_getTransactionReceipt", params: [initialTxHash] });
         *
         * // set value to 19
         * const data = "0x552410770000000000000000000000000000000000000000000000000000000000000019";
         * const txHash = await provider.request({ method: "eth_sendTransaction", params: [{ from, to: contractAddress, data }] });
         *
         * const { blockHash, transactionIndex } = await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] });
         * const storage = await provider.request({ method: "debug_storageRangeAt", params: [blockHash, transactionIndex, contractAddress, "0x01", 1] });
         * console.log(storage);
         * ```
         */
        debug_storageRangeAt(blockHash: DATA, transactionIndex: number, contractAddress: DATA, startKey: DATA, maxResult: number): Promise<Ethereum.StorageRangeAtResult<"private">>;
        /**
         * Returns all the Ethereum account addresses of all keys that have been
         * added.
         * @returns The Ethereum account addresses of all keys that have been added.
         * @example
         * ```javascript
         * console.log(await provider.send("personal_listAccounts"));
         * ```
         */
        personal_listAccounts(): Promise<string[]>;
        /**
         * Generates a new account with private key. Returns the address of the new
         * account.
         * @param passphrase - The passphrase to encrypt the private key with.
         * @returns The new account's address.
         * @example
         * ```javascript
         * const passphrase = "passphrase";
         * const address = await provider.send("personal_newAccount", [passphrase] );
         * console.log(address);
         * ```
         */
        personal_newAccount(passphrase: string): Promise<Address>;
        /**
         * Imports the given unencrypted private key (hex string) into the key store, encrypting it with the passphrase.
         *
         * @param rawKey - The raw, unencrypted private key to import.
         * @param passphrase - The passphrase to encrypt with.
         * @returns Returns the address of the new account.
         * @example
         * ```javascript
         * const rawKey = "0x0123456789012345678901234567890123456789012345678901234567890123";
         * const passphrase = "passphrase";
         *
         * const address = await provider.send("personal_importRawKey",[rawKey, passphrase] );
         * console.log(address);
         * ```
         */
        personal_importRawKey(rawKey: DATA, passphrase: string): Promise<Address>;
        /**
         * Locks the account. The account can no longer be used to send transactions.
         * @param address - The account address to be locked.
         * @returns Returns `true` if the account was locked, otherwise `false`.
         * @example
         * ```javascript
         * const [account] = await provider.send("personal_listAccounts");
         * const isLocked = await provider.send("personal_lockAccount", [account] );
         * console.log(isLocked);
         * ```
         */
        personal_lockAccount(address: DATA): Promise<boolean>;
        /**
         * Unlocks the account for use.
         *
         * The unencrypted key will be held in memory until the unlock duration
         * expires. The unlock duration defaults to 300 seconds. An explicit duration
         * of zero seconds unlocks the key until geth exits.
         *
         * The account can be used with `eth_sign` and `eth_sendTransaction` while it is
         * unlocked.
         * @param address - 20 Bytes - The address of the account to unlock.
         * @param passphrase - Passphrase to unlock the account.
         * @param duration - (default: 300) Duration in seconds how long the account
         * should remain unlocked for. Set to 0 to disable automatic locking.
         * @returns `true` if it worked. Throws an error or returns `false` if it did not.
         * @example
         * ```javascript
         * // generate an account
         * const passphrase = "passphrase";
         * const newAccount = await provider.send("personal_newAccount", [passphrase] );
         * const isUnlocked = await provider.send("personal_unlockAccount", [newAccount, passphrase] );
         * console.log(isUnlocked);
         * ```
         */
        personal_unlockAccount(address: DATA, passphrase: string, duration?: number): Promise<boolean>;
        /**
         * Validate the given passphrase and submit transaction.
         *
         * The transaction is the same argument as for `eth_sendTransaction` and
         * contains the from address. If the passphrase can be used to decrypt the
         * private key belonging to `tx.from` the transaction is verified, signed and
         * send onto the network. The account is not unlocked globally in the node
         * and cannot be used in other RPC calls.
         *
         * Transaction call object:
         * * `from`: `DATA`, 20 bytes (optional) - The address the transaction is sent from.
         * * `to`: `DATA`, 20 bytes - The address the transaction is sent to.
         * * `gas`: `QUANTITY` (optional) - Integer of the maximum gas allowance for the transaction.
         * * `gasPrice`: `QUANTITY` (optional) - Integer of the price of gas in wei.
         * * `value`: `QUANTITY` (optional) - Integer of the value in wei.
         * * `data`: `DATA` (optional) - Hash of the method signature and the ABI encoded parameters.
         *
         * @param txData - The transaction call object as seen in source.
         * @param passphrase - The passphrase to decrpyt the private key belonging to `tx.from`.
         * @returns The transaction hash or if unsuccessful an error.
         * @example
         * ```javascript
         * const passphrase = "passphrase";
         * const newAccount = await provider.send("personal_newAccount", [passphrase] );
         * // fund the new account
         * await provider.send("evm_setAccountBalance", [newAccount,"0xffffffffffffff"])
         * const [to] = await provider.send("personal_listAccounts");
         *
         * // use account and passphrase to send the transaction
         * const txHash = await provider.send("personal_sendTransaction", [{ from: newAccount, to, gasLimit: "0x5b8d80" }, passphrase] );
         * console.log(txHash);
         * ```
         */
        personal_sendTransaction(transaction: Ethereum.Transaction, passphrase: string): Promise<Data>;
        /**
         * Validates the given passphrase and signs a transaction that can be
         * submitted to the network at a later time using `eth_sendRawTransaction`.
         *
         * The transaction is the same argument as for `eth_signTransaction` and
         * contains the from address. If the passphrase can be used to decrypt the
         * private key belonging to `tx.from` the transaction is verified and signed.
         * The account is not unlocked globally in the node and cannot be used in other RPC calls.
         *
         * Transaction call object:
         * * `from`: `DATA`, 20 bytes (optional) - The address the transaction is sent from.
         * * `to`: `DATA`, 20 bytes - The address the transaction is sent to.
         * * `gas`: `QUANTITY` (optional) - Integer of the maximum gas allowance for the transaction.
         * * `gasPrice`: `QUANTITY` (optional) - Integer of the price of gas in wei.
         * * `value`: `QUANTITY` (optional) - Integer of the value in wei.
         * * `data`: `DATA` (optional) - Hash of the method signature and the ABI encoded parameters.
         *
         * @param transaction - The transaction call object as seen in source.
         * @returns The raw, signed transaction.
         * @example
         * ```javascript
         * const [to] = await provider.request({ method: "eth_accounts", params: [] });
         * const passphrase = "passphrase";
         * const from = await provider.send("personal_newAccount", [passphrase] );
         * await provider.request({ method: "eth_subscribe", params: ["newHeads"] });
         * const signedTx = await provider.request({ method: "personal_signTransaction", params: [{ from, to }, passphrase] });
         * console.log(signedTx)
         * ```
         */
        personal_signTransaction(transaction: Ethereum.Transaction, passphrase: string): Promise<Data>;
        /**
         * Returns object of RPC modules.
         * @returns RPC modules.
         * @example
         * ```javascript
         * console.log(await provider.send("rpc_modules"));
         * ```
         */
        rpc_modules(): Promise<typeof RPC_MODULES>;
        /**
         * Creates new whisper identity in the client.
         *
         * @returns - The address of the new identity.
         * @example
         * ```javascript
         * console.log(await provider.send("shh_newIdentity"));
         * ```
         */
        shh_newIdentity(): Promise<string>;
        /**
         * Checks if the client hold the private keys for a given identity.
         *
         * @param address - The identity address to check.
         * @returns Returns `true` if the client holds the private key for that identity, otherwise `false`.
         * @example
         * ```javascript
         * console.log(await provider.send("shh_hasIdentity", ["0x0"] ));
         * ```
         */
        shh_hasIdentity(address: DATA): Promise<boolean>;
        /**
         * Creates a new group.
         *
         * @returns The address of the new group.
         */
        shh_newGroup(): Promise<string>;
        /**
         * Adds a whisper identity to the group.
         *
         * @param address - The identity address to add to a group.
         * @returns `true` if the identity was successfully added to the group, otherwise `false`.
         * @example
         * ```javascript
         * console.log(await provider.send("shh_addToGroup", ["0x0"] ));
         * ```
         */
        shh_addToGroup(address: DATA): Promise<boolean>;
        /**
         * Creates filter to notify, when client receives whisper message matching the filter options.
         *
         * @param to - (optional) Identity of the receiver. When present it will try to decrypt any incoming message
         *  if the client holds the private key to this identity.
         * @param topics - Array of topics which the incoming message's topics should match.
         * @returns Returns `true` if the identity was successfully added to the group, otherwise `false`.
         * @example
         * ```javascript
         * console.log(await provider.send("shh_newFilter", ["0x0", []] ));
         * ```
         */
        shh_newFilter(to: DATA, topics: DATA[]): Promise<boolean>;
        /**
         * Uninstalls a filter with given id. Should always be called when watch is no longer needed.
         * Additionally filters timeout when they aren't requested with `shh_getFilterChanges` for a period of time.
         *
         * @param id - The filter id. Ex: "0x7"
         * @returns `true` if the filter was successfully uninstalled, otherwise `false`.
         * @example
         * ```javascript
         * console.log(await provider.send("shh_uninstallFilter", ["0x0"] ));
         * ```
         */
        shh_uninstallFilter(id: QUANTITY): Promise<boolean>;
        /**
         * Polling method for whisper filters. Returns new messages since the last call of this method.
         *
         * @param id - The filter id. Ex: "0x7"
         * @returns More Info: https://github.com/ethereum/wiki/wiki/JSON-RPC#shh_getfilterchanges
         * @example
         * ```javascript
         * console.log(await provider.send("shh_getFilterChanges", ["0x0"] ));
         * ```
         */
        shh_getFilterChanges(id: QUANTITY): Promise<[]>;
        /**
         * Get all messages matching a filter. Unlike shh_getFilterChanges this returns all messages.
         *
         * @param id - The filter id. Ex: "0x7"
         * @returns See: `shh_getFilterChanges`.
         * @example
         * ```javascript
         * console.log(await provider.send("shh_getMessages", ["0x0"] ));
         * ```
         */
        shh_getMessages(id: QUANTITY): Promise<boolean>;
        /**
         * Creates a whisper message and injects it into the network for distribution.
         *
         * @param postData -
         * @returns Returns `true` if the message was sent, otherwise `false`.
         * @example
         * ```javascript
         * console.log(await provider.send("shh_post", [{}] ));
         * ```
         */
        shh_post(postData: Ethereum.WhisperPostObject): Promise<boolean>;
        /**
         * Returns the current whisper protocol version.
         *
         * @returns The current whisper protocol version.
         * @example
         * ```javascript
         * console.log(await provider.send("shh_version"));
         * ```
         */
        shh_version(): Promise<string>;
        /**
         * Returns the current content of the transaction pool.
         *
         * @returns The transactions currently pending or queued in the transaction pool.
         * @example
         * ```javascript
         * const [from] = await provider.request({ method: "eth_accounts", params: [] });
         * await provider.send("miner_stop")
         * const pendingTx = await provider.request({ method: "eth_sendTransaction", params: [{ from, gas: "0x5b8d80", nonce:"0x0" }] });
         * const queuedTx = await provider.request({ method: "eth_sendTransaction", params: [{ from, gas: "0x5b8d80", nonce:"0x2" }] });
         * const pool = await provider.send("txpool_content");
         * console.log(pool);
         * ```
         */
        txpool_content(): Promise<Ethereum.Pool.Content<"private">>;
    }

    declare type EthereumConfig = {
        chain: ChainConfig;
        database: DatabaseConfig;
        logging: LoggingConfig;
        miner: MinerConfig;
        wallet: WalletConfig;
        fork: ForkConfig;
    };

    declare const EthereumFlavorName = "ethereum";

    declare type EthereumInternalOptions = {
        [K in keyof EthereumConfig]: InternalConfig<EthereumConfig[K]>;
    };

    declare type EthereumLegacyProviderOptions = Partial<MakeLegacyOptions<ChainConfig> & MakeLegacyOptions<DatabaseConfig> & MakeLegacyOptions<LoggingConfig> & MakeLegacyOptions<MinerConfig> & MakeLegacyOptions<WalletConfig> & MakeLegacyOptions<ForkConfig>>;

    declare type EthereumOptions<T = "ethereum"> = {
        flavor?: T;
    } & (EthereumProviderOptions | EthereumLegacyProviderOptions);

    export declare class EthereumProvider extends Emittery<{
        message: MessageEvent;
        data: DataEvent;
        error: Error;
        "ganache:vm:tx:step": VmStepEvent;
        "ganache:vm:tx:before": VmBeforeTransactionEvent;
        "ganache:vm:tx:after": VmAfterTransactionEvent;
        "ganache:vm:tx:console.log": VmConsoleLogEvent;
        connect: undefined;
        disconnect: undefined;
    }> implements Provider_2<EthereumApi> {
        #private;
        constructor(options: EthereumProviderOptions | EthereumLegacyProviderOptions, executor: Executor);
        initialize(): Promise<void>;
        /**
         * Returns the options, including defaults and generated, used to start Ganache.
         */
        getOptions(): EthereumInternalOptions;
        /**
         * Returns the unlocked accounts
         */
        getInitialAccounts(): Record<string, {
            unlocked: boolean;
            secretKey: string;
            balance: bigint;
        }>;
        /**
         * Remove an event subscription
         */
        removeListener: Emittery["off"];
        /**
         * @param method - the params
         * @param params - the params
         * @internal Non standard! Do not use.
         */
        send<Method extends RequestMethods>(method: Method, params?: OverloadedParameters<EthereumApi[typeof method]>): Simplify<ReturnType<EthereumApi[typeof method]>>;
        /**
         * @param payload - payload
         * @param callback - callback
         * @deprecated Use the `request` method
         */
        send<Method extends RequestMethods>(payload: JsonRpcRequest<EthereumApi, Method>, callback?: Callback): undefined;
        /**
         * Legacy callback style API
         * @param payloads - JSON-RPC payload
         * @param callback - callback
         * @deprecated Batch transactions have been deprecated. Send payloads
         * individually via the `request` method.
         */
        send<Method extends RequestMethods>(payloads: JsonRpcRequest<EthereumApi, Method>[], callback?: BatchedCallback): undefined;
        /**
         * Legacy callback style API
         * @param payload - JSON-RPC payload
         * @param callback - callback
         * @deprecated Use the `request` method.
         */
        /**
         * @param payload - payload
         * @param callback - callback
         * @deprecated Use the `request` method
         */
        sendAsync<Method extends KnownKeys<EthereumApi>>(payload: JsonRpcRequest<EthereumApi, Method>, callback?: Callback): undefined;
        /**
         * Legacy callback style API
         * @param payloads - JSON-RPC payload
         * @param callback - callback
         * @deprecated Batch transactions have been deprecated. Send payloads
         * individually via the `request` method.
         */
        sendAsync<Method extends KnownKeys<EthereumApi>>(payloads: JsonRpcRequest<EthereumApi, Method>[], callback?: BatchedCallback): undefined;
        /**
         * EIP-1193 style request method
         * @param args -
         * @returns A Promise that resolves with the method's result or rejects with a CodedError
         * @EIP [1193](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md)
         */
        request<Method extends RequestMethods>(args: RequestParams<Method>): Simplify<ReturnType<EthereumApi[Method]>>;
        /**
         * INTERNAL. Used when the caller wants to access the original `PromiEvent`,
         * which would otherwise be flattened into a regular Promise through the
         * Promise chain.
         * @param request - the request
         */
        _requestRaw<Method extends RequestMethods>({ method, params }: RequestParams<Method>): Promise<{
            value: Promise<ReturnType<EthereumApi[Method]> extends infer T ? T extends ReturnType<EthereumApi[Method]> ? T extends Promise<unknown> ? {} : never : never : never>;
        }>;
        /**
         * Disconnect the provider instance. This will cause the underlying blockchain to be stopped, and any pending
         * tasks to be rejected. Emits a `disconnect` event once successfully disconnected.
         * @returns Fullfills with `undefined` once the provider has been disconnected.
         */
        disconnect: () => Promise<void>;
    }

    declare type EthereumProviderOptions = Partial<{
        [K in keyof EthereumConfig]: ExternalConfig<EthereumConfig[K]>;
    }>;

    declare type EthereumRawAccount = [
    nonce: Buffer,
    balance: Buffer,
    stateRoot: Buffer,
    codeHash: Buffer
    ];

    declare type EthereumRawBlockHeader = [
    parentHash: Buffer,
    sha3Uncles: Buffer,
    miner: Buffer,
    stateRoot: Buffer,
    transactionsRoot: Buffer,
    receiptsRoot: Buffer,
    logsBloom: Buffer,
    difficulty: Buffer,
    number: Buffer,
    gasLimit: Buffer,
    gasUsed: Buffer,
    timestamp: Buffer,
    extraData: Buffer,
    mixHash: Buffer,
    nonce: Buffer,
    baseFeePerGas?: Buffer
    ];

    declare type EthereumRawReceipt = [
    status: Buffer,
    cumulativeGasUsed: Buffer,
    logsBloom: Buffer,
    logs: TransactionLog[]
    ];

    declare namespace ethers  {
        namespace providers {
            type JsonRpcProvider = any
        }
    }

    declare type EthSignedDataParams = Parameters<typeof EthSigUtil.signTypedData_v4>[1]["data"];

    declare namespace EthSigUtil {
        export {
            TypedData,
            Version,
            EthEncryptedData,
            SignedMsgParams,
            MsgParams,
            TypedMessage,
            TYPED_MESSAGE_SCHEMA,
            TypedDataUtils,
            concatSig,
            normalize,
            personalSign,
            recoverPersonalSignature,
            extractPublicKey,
            externalTypedSignatureHash as typedSignatureHash,
            signTypedDataLegacy,
            recoverTypedSignatureLegacy,
            encrypt,
            encryptSafely,
            decrypt,
            decryptSafely,
            getEncryptionPublicKey,
            signTypedMessage,
            recoverTypedMessage,
            signTypedData,
            signTypedData_v4,
            recoverTypedSignature,
            recoverTypedSignature_v4
        }
    }

    declare interface EventMap {
        [event: string]: AsyncListener<any, any>;
    }

    /**
     * EVM is responsible for executing an EVM message fully
     * (including any nested calls and creates), processing the results
     * and storing them to state (or discarding changes in case of exceptions).
     * @ignore
     */
    declare class EVM implements EVMInterface {
        protected _tx?: {
            gasPrice: bigint;
            origin: Address_2;
        };
        protected _block?: Block_2;
        readonly _common: Common;
        eei: EEIInterface;
        readonly _transientStorage: TransientStorage;
        readonly events: AsyncEventEmitter<EVMEvents>;
        /**
         * This opcode data is always set since `getActiveOpcodes()` is called in the constructor
         * @hidden
         */
        _opcodes: OpcodeList;
        readonly _allowUnlimitedContractSize: boolean;
        protected readonly _customOpcodes?: CustomOpcode[];
        protected readonly _customPrecompiles?: CustomPrecompile[];
        /**
         * @hidden
         */
        _handlers: Map<number, OpHandler>;
        /**
         * @hidden
         */
        _dynamicGasHandlers: Map<number, AsyncDynamicGasHandler | SyncDynamicGasHandler>;
        protected _precompiles: Map<string, PrecompileFunc>;
        protected readonly _optsCached: EVMOpts;
        get precompiles(): Map<string, PrecompileFunc>;
        get opcodes(): OpcodeList;
        protected _isInitialized: boolean;
        /**
         * Pointer to the mcl package, not for public usage
         * set to public due to implementation internals
         * @hidden
         */
        readonly _mcl: any;
        /**
         * EVM is run in DEBUG mode (default: false)
         * Taken from DEBUG environment variable
         *
         * Safeguards on debug() calls are added for
         * performance reasons to avoid string literal evaluation
         * @hidden
         */
        readonly DEBUG: boolean;
        readonly _emit: (topic: string, data: any) => Promise<void>;
        /**
         * EVM async constructor. Creates engine instance and initializes it.
         *
         * @param opts EVM engine constructor options
         */
        static create(opts: EVMOpts): Promise<EVM>;
        constructor(opts: EVMOpts);
        protected init(): Promise<void>;
        /**
         * Returns a list with the currently activated opcodes
         * available for EVM execution
         */
        getActiveOpcodes(): OpcodeList;
        protected _executeCall(message: MessageWithTo): Promise<EVMResult>;
        protected _executeCreate(message: Message): Promise<EVMResult>;
        /**
         * Starts the actual bytecode processing for a CALL or CREATE, providing
         * it with the {@link EEI}.
         */
        protected runInterpreter(message: Message, opts?: InterpreterOpts): Promise<ExecResult>;
        /**
         * Executes an EVM message, determining whether it's a call or create
         * based on the `to` address. It checkpoints the state and reverts changes
         * if an exception happens during the message execution.
         */
        runCall(opts: EVMRunCallOpts): Promise<EVMResult>;
        /**
         * Bound to the global VM and therefore
         * shouldn't be used directly from the evm class
         */
        runCode(opts: EVMRunCodeOpts): Promise<ExecResult>;
        /**
         * Returns code for precompile at the given address, or undefined
         * if no such precompile exists.
         */
        getPrecompile(address: Address_2): PrecompileFunc | undefined;
        /**
         * Executes a precompiled contract with given data and gas limit.
         */
        protected runPrecompile(code: PrecompileFunc, data: Buffer, gasLimit: bigint): Promise<ExecResult> | ExecResult;
        protected _loadCode(message: Message): Promise<void>;
        protected _generateAddress(message: Message): Promise<Address_2>;
        protected _reduceSenderBalance(account: Account_2, message: Message): Promise<void>;
        protected _addToBalance(toAccount: Account_2, message: MessageWithTo): Promise<void>;
        protected _touchAccount(address: Address_2): Promise<void>;
        /**
         * Once the interpreter has finished depth 0, a post-message cleanup should be done
         */
        private postMessageCleanup;
        copy(): EVMInterface;
    }

    declare class EvmError {
        error: ERROR;
        errorType: string;
        constructor(error: ERROR);
    }

    declare type EVMEvents = {
        newContract: (data: NewContractEvent, resolve?: (result?: any) => void) => void;
        beforeMessage: (data: Message, resolve?: (result?: any) => void) => void;
        afterMessage: (data: EVMResult, resolve?: (result?: any) => void) => void;
        step: (data: InterpreterStep, resolve?: (result?: any) => void) => void;
    };

    /**
     * API of the EVM
     */
    declare interface EVMInterface {
        runCall(opts: EVMRunCallOpts): Promise<EVMResult>;
        runCode?(opts: EVMRunCodeOpts): Promise<ExecResult>;
        getActiveOpcodes?(): OpcodeList;
        precompiles: Map<string, any>;
        copy(): EVMInterface;
        eei: EEIInterface;
        events?: AsyncEventEmitter<EVMEvents>;
    }

    /**
     * Options for instantiating a {@link EVM}.
     */
    declare interface EVMOpts {
        /**
         * Use a {@link Common} instance for EVM instantiation.
         *
         * ### Supported EIPs
         *
         * - [EIP-1153](https://eips.ethereum.org/EIPS/eip-1153) - Transient Storage Opcodes (`experimental`)
         * - [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559) - EIP-1559 Fee Market
         * - [EIP-2315](https://eips.ethereum.org/EIPS/eip-2315) - VM simple subroutines (`experimental`)
         * - [EIP-2537](https://eips.ethereum.org/EIPS/eip-2537) - BLS12-381 precompiles (`experimental`)
         * - [EIP-2565](https://eips.ethereum.org/EIPS/eip-2565) - ModExp Gas Cost
         * - [EIP-2718](https://eips.ethereum.org/EIPS/eip-2718) - Typed Transactions
         * - [EIP-2929](https://eips.ethereum.org/EIPS/eip-2929) - Gas cost increases for state access opcodes
         * - [EIP-2930](https://eips.ethereum.org/EIPS/eip-2930) - Access List Transaction Type
         * - [EIP-3198](https://eips.ethereum.org/EIPS/eip-3198) - BASEFEE opcode
         * - [EIP-3529](https://eips.ethereum.org/EIPS/eip-3529) - Reduction in refunds
         * - [EIP-3540](https://eips.ethereum.org/EIPS/eip-3541) - EVM Object Format (EOF) v1 (`experimental`)
         * - [EIP-3541](https://eips.ethereum.org/EIPS/eip-3541) - Reject new contracts starting with the 0xEF byte
         *   [EIP-3651](https://eips.ethereum.org/EIPS/eip-3651) - Warm COINBASE (`experimental`)
         * - [EIP-3670](https://eips.ethereum.org/EIPS/eip-3670) - EOF - Code Validation (`experimental`)
         * - [EIP-3855](https://eips.ethereum.org/EIPS/eip-3855) - PUSH0 instruction (`experimental`)
         * - [EIP-3860](https://eips.ethereum.org/EIPS/eip-3860) - Limit and meter initcode (`experimental`)
         * - [EIP-4399](https://eips.ethereum.org/EIPS/eip-4399) - Supplant DIFFICULTY opcode with PREVRANDAO (Merge)
         * - [EIP-5133](https://eips.ethereum.org/EIPS/eip-5133) - Delaying Difficulty Bomb to mid-September 2022
         *
         * *Annotations:*
         *
         * - `experimental`: behaviour can change on patch versions
         */
        common?: Common;
        /**
         * Allows unlimited contract sizes while debugging. By setting this to `true`, the check for
         * contract size limit of 24KB (see [EIP-170](https://git.io/vxZkK)) is bypassed.
         *
         * Default: `false` [ONLY set to `true` during debugging]
         */
        allowUnlimitedContractSize?: boolean;
        /**
         * Override or add custom opcodes to the EVM instruction set
         * These custom opcodes are EIP-agnostic and are always statically added
         * To delete an opcode, add an entry of format `{opcode: number}`. This will delete that opcode from the EVM.
         * If this opcode is then used in the EVM, the `INVALID` opcode would instead be used.
         * To add an opcode, add an entry of the following format:
         * {
         *    // The opcode number which will invoke the custom opcode logic
         *    opcode: number
         *    // The name of the opcode (as seen in the `step` event)
         *    opcodeName: string
         *    // The base fee of the opcode
         *    baseFee: number
         *    // If the opcode charges dynamic gas, add this here. To charge the gas, use the `i` methods of the BN, to update the charged gas
         *    gasFunction?: function(runState: RunState, gas: BN, common: Common)
         *    // The logic of the opcode which holds the logic of changing the current state
         *    logicFunction: function(runState: RunState)
         * }
         * Note: gasFunction and logicFunction can both be async or synchronous functions
         */
        customOpcodes?: CustomOpcode[];
        customPrecompiles?: CustomPrecompile[];
        eei: EEIInterface;
    }

    /**
     * Result of executing a message via the {@link EVM}.
     */
    declare interface EVMResult {
        /**
         * Address of created account during transaction, if any
         */
        createdAddress?: Address_2;
        /**
         * Contains the results from running the code, if any, as described in {@link runCode}
         */
        execResult: ExecResult;
    }

    /**
     * Options for running a call (or create) operation with `EVM.runCall()`
     */
    declare interface EVMRunCallOpts {
        /**
         * The `block` the `tx` belongs to. If omitted a default blank block will be used.
         */
        block?: Block_2;
        /**
         * The gas price for the call. Defaults to `0`
         */
        gasPrice?: bigint;
        /**
         * The address where the call originated from. Defaults to the zero address.
         */
        origin?: Address_2;
        /**
         * The address that ran this code (`msg.sender`). Defaults to the zero address.
         */
        caller?: Address_2;
        /**
         * The gas limit for the call. Defaults to `0xffffff`
         */
        gasLimit?: bigint;
        /**
         * The to address. Defaults to the zero address.
         */
        to?: Address_2;
        /**
         * The value in ether that is being sent to `opts.to`. Defaults to `0`
         */
        value?: bigint;
        /**
         * The data for the call.
         */
        data?: Buffer;
        /**
         * This is for CALLCODE where the code to load is different than the code from the `opts.to` address.
         */
        code?: Buffer;
        /**
         * The call depth. Defaults to `0`
         */
        depth?: number;
        /**
         * If the code location is a precompile.
         */
        isCompiled?: boolean;
        /**
         * If the call should be executed statically. Defaults to false.
         */
        isStatic?: boolean;
        /**
         * An optional salt to pass to CREATE2.
         */
        salt?: Buffer;
        /**
         * Addresses to selfdestruct. Defaults to none.
         */
        selfdestruct?: {
            [k: string]: boolean;
        };
        /**
         * Skip balance checks if true. If caller balance is less than message value,
         * sets balance to message value to ensure execution doesn't fail.
         */
        skipBalance?: boolean;
        /**
         * If the call is a DELEGATECALL. Defaults to false.
         */
        delegatecall?: boolean;
        /**
         * Refund counter. Defaults to `0`
         */
        gasRefund?: bigint;
        /**
         * Optionally pass in an already-built message.
         */
        message?: Message;
    }

    /**
     * Options for the `EVM.runCode()` method.
     */
    declare interface EVMRunCodeOpts {
        /**
         * The `block` the `tx` belongs to. If omitted a default blank block will be used.
         */
        block?: Block_2;
        /**
         * Pass a custom {@link EVM} to use. If omitted the default {@link EVM} will be used.
         */
        evm?: EVM;
        /**
         * The gas price for the call. Defaults to `0`
         */
        gasPrice?: bigint;
        /**
         * The address where the call originated from. Defaults to the zero address.
         */
        origin?: Address_2;
        /**
         * The address that ran this code (`msg.sender`). Defaults to the zero address.
         */
        caller?: Address_2;
        /**
         * The EVM code to run.
         */
        code?: Buffer;
        /**
         * The input data.
         */
        data?: Buffer;
        /**
         * The gas limit for the call.
         */
        gasLimit: bigint;
        /**
         * The value in ether that is being sent to `opts.address`. Defaults to `0`
         */
        value?: bigint;
        /**
         * The call depth. Defaults to `0`
         */
        depth?: number;
        /**
         * If the call should be executed statically. Defaults to false.
         */
        isStatic?: boolean;
        /**
         * Addresses to selfdestruct. Defaults to none.
         */
        selfdestruct?: {
            [k: string]: boolean;
        };
        /**
         * The address of the account that is executing this code (`address(this)`). Defaults to the zero address.
         */
        address?: Address_2;
        /**
         * The initial program counter. Defaults to `0`
         */
        pc?: number;
    }

    /**
     * API for EVM state access, this extends the base interface from
     * the `@ethereumjs/statemanager` package and is part of the broader
     * EEI (see EEI interface).
     *
     * An implementation of this can be found in the `@ethereumjs/vm` package.
     */
    declare interface EVMStateAccess extends StateAccess {
        addWarmedAddress(address: Buffer): void;
        isWarmedAddress(address: Buffer): boolean;
        addWarmedStorage(address: Buffer, slot: Buffer): void;
        isWarmedStorage(address: Buffer, slot: Buffer): boolean;
        clearWarmedAccounts(): void;
        generateAccessList?(addressesRemoved: Address_2[], addressesOnlyStorage: Address_2[]): AccessList_2;
        clearOriginalStorageCache(): void;
        cleanupTouchedAccounts(): Promise<void>;
        generateCanonicalGenesis(initState: any): Promise<void>;
    }

    declare type EvmStepContext = {};

    declare type ExclusiveGroup<C extends Base.Config, K extends ExclusiveGroupIndex<C> = ExclusiveGroupIndex<C>> = ExclusiveGroups<C>[K];

    declare type ExclusiveGroupIndex<C extends Base.Config> = number & keyof ExclusiveGroups<C>;

    declare type ExclusiveGroupOptionalUnionByName<C extends Base.Config, GRP extends ExclusiveGroup<C>, M extends OptionName<C>, T extends "rawType" | "type"> = {
        [K in keyof RequireOnly<ExclusiveGroupOptionsByGroup<C, GRP>, M>]: K extends M ? T extends "type" ? OptionType<C, M> : OptionRawType<C, M> : never;
    };

    declare type ExclusiveGroupOptionName<C extends Base.Config, K extends ExclusiveGroupIndex<C> = ExclusiveGroupIndex<C>> = Extract<OptionName<C>, DeepTupleToUnion<ExclusiveGroup<C, K>>>;

    declare type ExclusiveGroupOptionNameOption<C extends Base.Config, N> = N extends OptionName<C> ? Option<C, N> : never;

    declare type ExclusiveGroupOptionPairs<C extends Base.Config, G extends unknown[]> = G extends [] ? [] : G extends [infer N, ...infer R] ? [
    [
    N,
    ExclusiveGroupOptionNameOption<C, N>
    ],
    ...ExclusiveGroupOptionPairs<C, R>
    ] : never;

    declare type ExclusiveGroupOptionsByGroup<C extends Base.Config, G extends ExclusiveGroup<C>> = PairsToMapping<ExclusiveGroupOptionPairs<C, G>>;

    declare type ExclusiveGroups<C extends Base.Config> = C["exclusiveGroups"];

    declare type ExclusiveGroupUnionAndUnconstrainedPlus<C extends Base.Config, T extends "rawType" | "type", GRPS extends ExclusiveGroups<C> = ExclusiveGroups<C>, O extends unknown[] = []> = GRPS extends [infer GRP, ...infer Rest] ? GRP extends ExclusiveGroup<C> ? Rest extends any[] ? O extends [] ? ExclusiveGroupUnionAndUnconstrainedPlus<C, T, Rest, UnionToTuple<Combine<C, {}, GRP, T>>> : ExclusiveGroupUnionAndUnconstrainedPlus<C, T, Rest, UnionToTuple<{
        [OK in keyof Omit<O, keyof []>]: Combine<C, O[OK], GRP, T>;
    } extends {
        [n: number]: infer I;
    } ? I : never>> : never : never : O extends {
        [n: number]: infer I;
    } ? true extends IsNeverType<I> ? {
        [Key in keyof UnconstrainedOptionsByType<C, T>]: UnconstrainedOptionsByType<C, T>[Key];
    } : I : never;

    /**
     * Result of executing a call via the {@link EVM}.
     */
    declare interface ExecResult {
        runState?: RunState;
        /**
         * Description of the exception, if any occurred
         */
        exceptionError?: EvmError;
        /**
         * Amount of gas left
         */
        gas?: bigint;
        /**
         * Amount of gas the code used to run
         */
        executionGasUsed: bigint;
        /**
         * Return value from the contract
         */
        returnValue: Buffer;
        /**
         * Array of logs that the contract emitted
         */
        logs?: Log[];
        /**
         * A map from the accounts that have self-destructed to the addresses to send their funds to
         */
        selfdestruct?: {
            [k: string]: Buffer;
        };
        /**
         * The gas refund counter
         */
        gasRefund?: bigint;
    }

    declare type Executables = {
        inProgress: Set<TypedTransaction>;
        pending: Map<string, Heap<TypedTransaction>>;
    };

    declare class Executor {
        #private;
        /**
         * The Executor handles execution of methods on the given API
         */
        constructor(requestCoordinator: RequestCoordinator);
        /**
         * Stop processing requests. We pass this call through to the requestCoordinator, which means that api
         * validation will continue to work after calling stop() in execute().
         */
        stop(): void;
        /**
         * Finalise shutdown of the underlying RequestCoordinator.
         */
        end(): void;
        /**
         * Executes the method with the given methodName on the API
         * @param methodName - The name of the JSON-RPC method to execute.
         * @param params - The params to pass to the JSON-RPC method.
         */
        execute<T extends Api, M extends KnownKeys<T>>(api: T, methodName: M, params: OverloadedParameters<T[M]>): Promise<{
            value: ReturnType<T[M]>;
        }>;
    }

    export declare type _ExperimentalInfo = Readonly<{
        version: string;
        fork: Readonly<{
            /**
             * Chains Ganache is known to be compatible with. Operations performed
             * locally at historic block numbers will use the Ethereum Virtual Machine
             * OPCODEs, gas prices, and EIPs that were active at the time the historic
             * block originally took place.
             */
            knownChainIds: number[];
        }>;
    }>;

    declare class ExtensionNode extends Node {
        constructor(nibbles: Nibbles, value: Buffer);
        static encodeKey(key: Nibbles): Nibbles;
    }

    declare type ExternalConfig<C extends Base.Config> = Partial<ExclusiveGroupUnionAndUnconstrainedPlus<C, "rawType">>;

    declare type Externalize<X> = X extends Primitives ? X : X extends Quantity | Data | ITraceData | Address ? string : {
        [N in keyof X]: Externalize<X[N]>;
    };

    declare function externalTypedSignatureHash(typedData: EIP712TypedData[]): string;

    declare function extractPublicKey<T extends MessageTypes>(msgParams: SignedMsgParams<TypedData | TypedMessage<T>>): string;

    declare type ExtractValuesFromType<T> = {
        [I in keyof T]: T[I];
    }[keyof T];

    declare type FeeHistory = {
        oldestBlock: Quantity;
        baseFeePerGas: Quantity[];
        gasUsedRatio: number[];
        reward?: Array<Quantity[]>;
    };

    /**
     * Typed transaction with a new gas fee market mechanism
     *
     * - TransactionType: 2
     * - EIP: [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559)
     */
    declare class FeeMarketEIP1559Transaction extends BaseTransaction_2<FeeMarketEIP1559Transaction> {
        readonly chainId: bigint;
        readonly accessList: AccessListBuffer;
        readonly AccessListJSON: AccessList;
        readonly maxPriorityFeePerGas: bigint;
        readonly maxFeePerGas: bigint;
        readonly common: Common;
        /**
         * The default HF if the tx type is active on that HF
         * or the first greater HF where the tx is active.
         *
         * @hidden
         */
        protected DEFAULT_HARDFORK: string;
        /**
         * Instantiate a transaction from a data dictionary.
         *
         * Format: { chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data,
         * accessList, v, r, s }
         *
         * Notes:
         * - `chainId` will be set automatically if not provided
         * - All parameters are optional and have some basic default values
         */
        static fromTxData(txData: FeeMarketEIP1559TxData, opts?: TxOptions): FeeMarketEIP1559Transaction;
        /**
         * Instantiate a transaction from the serialized tx.
         *
         * Format: `0x02 || rlp([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data,
         * accessList, signatureYParity, signatureR, signatureS])`
         */
        static fromSerializedTx(serialized: Buffer, opts?: TxOptions): FeeMarketEIP1559Transaction;
        /**
         * Create a transaction from a values array.
         *
         * Format: `[chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data,
         * accessList, signatureYParity, signatureR, signatureS]`
         */
        static fromValuesArray(values: FeeMarketEIP1559ValuesArray, opts?: TxOptions): FeeMarketEIP1559Transaction;
        /**
         * This constructor takes the values, validates them, assigns them and freezes the object.
         *
         * It is not recommended to use this constructor directly. Instead use
         * the static factory methods to assist in creating a Transaction object from
         * varying data types.
         */
        constructor(txData: FeeMarketEIP1559TxData, opts?: TxOptions);
        /**
         * The amount of gas paid for the data in this tx
         */
        getDataFee(): bigint;
        /**
         * The up front amount that an account must have for this transaction to be valid
         * @param baseFee The base fee of the block (will be set to 0 if not provided)
         */
        getUpfrontCost(baseFee?: bigint): bigint;
        /**
         * Returns a Buffer Array of the raw Buffers of the EIP-1559 transaction, in order.
         *
         * Format: `[chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data,
         * accessList, signatureYParity, signatureR, signatureS]`
         *
         * Use {@link FeeMarketEIP1559Transaction.serialize} to add a transaction to a block
         * with {@link Block.fromValuesArray}.
         *
         * For an unsigned tx this method uses the empty Buffer values for the
         * signature parameters `v`, `r` and `s` for encoding. For an EIP-155 compliant
         * representation for external signing use {@link FeeMarketEIP1559Transaction.getMessageToSign}.
         */
        raw(): FeeMarketEIP1559ValuesArray;
        /**
         * Returns the serialized encoding of the EIP-1559 transaction.
         *
         * Format: `0x02 || rlp([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data,
         * accessList, signatureYParity, signatureR, signatureS])`
         *
         * Note that in contrast to the legacy tx serialization format this is not
         * valid RLP any more due to the raw tx type preceding and concatenated to
         * the RLP encoding of the values.
         */
        serialize(): Buffer;
        /**
         * Returns the serialized unsigned tx (hashed or raw), which can be used
         * to sign the transaction (e.g. for sending to a hardware wallet).
         *
         * Note: in contrast to the legacy tx the raw message format is already
         * serialized and doesn't need to be RLP encoded any more.
         *
         * ```javascript
         * const serializedMessage = tx.getMessageToSign(false) // use this for the HW wallet input
         * ```
         *
         * @param hashMessage - Return hashed message if set to true (default: true)
         */
        getMessageToSign(hashMessage?: boolean): Buffer;
        /**
         * Computes a sha3-256 hash of the serialized tx.
         *
         * This method can only be used for signed txs (it throws otherwise).
         * Use {@link FeeMarketEIP1559Transaction.getMessageToSign} to get a tx hash for the purpose of signing.
         */
        hash(): Buffer;
        /**
         * Computes a sha3-256 hash which can be used to verify the signature
         */
        getMessageToVerifySignature(): Buffer;
        /**
         * Returns the public key of the sender
         */
        getSenderPublicKey(): Buffer;
        _processSignature(v: bigint, r: Buffer, s: Buffer): FeeMarketEIP1559Transaction;
        /**
         * Returns an object with the JSON representation of the transaction
         */
        toJSON(): JsonTx;
        /**
         * Return a compact error string representation of the object
         */
        errorStr(): string;
        /**
         * Internal helper function to create an annotated error message
         *
         * @param msg Base error message
         * @hidden
         */
        protected _errorMsg(msg: string): string;
    }

    /**
     * {@link FeeMarketEIP1559Transaction} data.
     */
    declare interface FeeMarketEIP1559TxData extends AccessListEIP2930TxData {
        /**
         * The transaction's gas price, inherited from {@link Transaction}.  This property is not used for EIP1559
         * transactions and should always be undefined for this specific transaction type.
         */
        gasPrice?: never;
        /**
         * The maximum inclusion fee per gas (this fee is given to the miner)
         */
        maxPriorityFeePerGas?: BigIntLike;
        /**
         * The maximum total fee
         */
        maxFeePerGas?: BigIntLike;
    }

    /**
     * Buffer values array for a {@link FeeMarketEIP1559Transaction}
     */
    declare type FeeMarketEIP1559ValuesArray = [
    Buffer,
    Buffer,
    Buffer,
    Buffer,
    Buffer,
    Buffer,
    Buffer,
    Buffer,
    AccessListBuffer,
    Buffer?,
    Buffer?,
    Buffer?
    ];

    declare class FilecoinApi implements Api {
        #private;
        readonly [index: string]: (...args: any) => Promise<any>;
        constructor(blockchain: Blockchain_3);
        initialize(): Promise<void>;
        stop(): Promise<void>;
        /**
         * Provides information about the provider.
         *
         * @returns A `Version` object with various version details
         * and the current block interval.
         */
        "Filecoin.Version"(): Promise<SerializedVersion>;
        /**
         * Returns the libp2p Peer ID. Since Filecoin-flavored Ganache
         * does not connect to a network, it doesn't leverage libp2p.
         * This method instead returns a hardcoded Peer ID based on
         * the string "ganache".
         *
         * @returns `bafzkbzaced47iu7qygeshb3jamzkh2cqcmlxzcpxrnqsj6yoipuidor523jyg`
         */
        "Filecoin.ID"(): Promise<string>;
        /**
         * Returns the genesis tipset (tipset.Height = 0).
         *
         * @returns The genesis tipset.
         */
        "Filecoin.ChainGetGenesis"(): Promise<SerializedTipset>;
        /**
         * Returns the head of the blockchain, which is the latest tipset.
         *
         * @returns The latest tipset.
         */
        "Filecoin.ChainHead"(): Promise<SerializedTipset>;
        /**
         * Starts a subscription to receive the latest tipset once
         * it has been mined.
         *
         * Reference implementation entry point: https://git.io/JtO3a
         *
         * @param rpcId - This parameter is not provided by the user, but
         * injected by the internal system.
         * @returns An object with the subscription ID and an unsubscribe
         * function.
         */
        "Filecoin.ChainNotify"(rpcId?: string): PromiEvent<Subscription>;
        /**
         * Receives the `xrpc.ch.close` method which cancels a
         * subscription.
         *
         * @param subscriptionId - The subscription ID to cancel.
         * @returns `false` if the subscription ID doesn't exist or
         * if the subscription is already canceled, `true` otherwise.
         */
        [ChannelClosed](subscriptionId: SubscriptionId_2): Promise<boolean>;
        /**
         * Returns the tipset for the provided tipset key.
         *
         * @param serializedTipsetKey - an array of the Block RootCIDs
         * that are part of the tipset. Must be an exact match and
         * must include exactly the same number of blocks that are
         * actually in the tipset.
         * @returns The matched tipset.
         */
        "Filecoin.ChainGetTipSet"(serializedTipsetKey: Array<SerializedRootCID>): Promise<SerializedTipset>;
        /**
         * Returns the tipset for the provided tipset height.
         *
         * @param height - A `number` which indicates the `tipset.Height`
         * that you would like to retrieve.
         * @param serializedTipsetKey - An optional tipset key, an array
         * of the Block RootCIDs that are part of the tipset. Must be
         * an exact match and must include exactly the same number of
         * blocks that are actually in the tipset.
         * @returns The matched tipset.
         */
        "Filecoin.ChainGetTipSetByHeight"(height: number, serializedTipsetKey?: Array<SerializedRootCID>): Promise<SerializedTipset>;
        /**
         * Returns a block for the given RootCID.
         *
         * @param serializedBlockCid - The RootCID of the block.
         * @returns The matched Block.
         */
        "Filecoin.ChainGetBlock"(serializedBlockCid: SerializedRootCID): Promise<SerializedBlockHeader>;
        /**
         * Returns the BlockMessages object, or all of the messages
         * that are part of a block, for a given block RootCID.
         *
         * @param serializedBlockCid - The RootCID of the block.
         * @returns The matched BlockMessages object.
         */
        "Filecoin.ChainGetBlockMessages"(serializedBlockCid: SerializedRootCID): Promise<SerializedBlockMessages>;
        /**
         * Returns a Message for a given RootCID.
         *
         * @param serializedMessageCid - The RootCID of the message.
         * @returns The matched Message object.
         */
        "Filecoin.ChainGetMessage"(serializedMessageCid: SerializedRootCID): Promise<SerializedMessage>;
        /**
         * Gets the next nonce of an address, including any pending
         * messages in the current message pool.
         *
         * @param address - A `string` of the public address.
         * @returns A `number` of the next nonce.
         */
        "Filecoin.MpoolGetNonce"(address: string): Promise<number>;
        /**
         * Submits a signed message to be added to the message
         * pool.
         *
         * Only value transfers are supported (`Method = 0`).
         *
         * @param signedMessage - The SignedMessage object.
         * @returns The RootCID of the signed message.
         */
        "Filecoin.MpoolPush"(signedMessage: SerializedSignedMessage): Promise<SerializedRootCID>;
        /**
         * Submits an array of signed messages to be added to
         * the message pool.
         *
         * Messages are processed in index order of the array;
         * if any of them are invalid for any reason, the valid
         * messages up to that point are still added to the message
         * pool. The invalid message, as well as following messages
         * in the array, will not be processed or added to the
         * message pool.
         *
         * Only value transfers are supported (`Method = 0`).
         *
         * Reference implementation: https://git.io/JtgeG
         *
         * @param signedMessages - The array of SignedMessage objects.
         * @returns An array of RootCIDs for signed messages that
         * were valid and added to the message pool. The order of the
         * output array matches the order of the input array.
         */
        "Filecoin.MpoolBatchPush"(signedMessages: Array<SerializedSignedMessage>): Promise<Array<SerializedRootCID>>;
        /**
         * Submits an unsigned message to be added to the message
         * pool.
         *
         * The `From` address must be one of the addresses held
         * in the wallet; see `Filecoin.WalletList` to retrieve
         * a list of addresses currently in the wallet. The `Nonce`
         * must be `0` and is filled in with the correct value in
         * the response object. Gas-related parameters will be
         * generated if not filled.
         *
         * Only value transfers are supported (`Method = 0`).
         *
         * @param message - The Message object.
         * @param spec - The MessageSendSpec object which defines
         * the MaxFee.
         * @returns The corresponding SignedMessage that was added
         * to the message pool.
         */
        "Filecoin.MpoolPushMessage"(message: SerializedMessage, spec: SerializedMessageSendSpec): Promise<SerializedSignedMessage>;
        /**
         * Submits an array of unsigned messages to be added to
         * the message pool.
         *
         * Messages are processed in index order of the array;
         * if any of them are invalid for any reason, the valid
         * messages up to that point are still added to the message
         * pool. The invalid message, as well as following messages
         * in the array, will not be processed or added to the
         * message pool.
         *
         * The `From` address must be one of the addresses
         * held in the wallet; see `Filecoin.WalletList` to retrieve
         * a list of addresses currently in the wallet. The `Nonce`
         * must be `0` and is filled in with the correct value in
         * the response object. Gas-related parameters will be
         * generated if not filled.
         *
         * Only value transfers are supported (`Method = 0`).
         *
         * Reference implementation: https://git.io/JtgeU
         *
         * @param messages - The array of Message objects.
         * @param spec - The MessageSendSpec object which defines
         * the MaxFee.
         * @returns An array of SignedMessages that were valid and
         * added to the message pool. The order of the output array
         * matches the order of the input array.
         */
        "Filecoin.MpoolBatchPushMessage"(messages: Array<SerializedMessage>, spec: SerializedMessageSendSpec): Promise<Array<SerializedSignedMessage>>;
        /**
         * Clears the current pending message pool; any messages in
         * the pool will not be processed in the next tipset/block
         * mine.
         *
         * @param local - In a normal Lotus node, setting this to `true`
         * will only clear local messages from the message pool. Since
         * Filecoin-flavored Ganache doesn't have a network, all messages
         * are local, and therefore all messages from the message pool
         * will be removed regardless of the value of this flag.
         */
        "Filecoin.MpoolClear"(local: boolean): Promise<void>;
        /**
         * Returns a list of messages in the current pending message
         * pool.
         *
         * @param tipsetKey - A normal Lotus node accepts an optional single
         * parameter of the TipsetKey to refer to the pending messages.
         * However, with the design of Filecoin-flavored Ganache, this
         * parameter is not used.
         * @returns An array of SignedMessage objects that are in the message pool.
         */
        "Filecoin.MpoolPending"(tipsetKey: Array<RootCID>): Promise<Array<SerializedSignedMessage>>;
        /**
         * Returns a list of pending messages for inclusion in the next block.
         * Since all messages in the message pool are included in the next
         * block for Filecoin-flavored Ganache, this method returns the same
         * result as `Filecoin.MpoolPending`.
         *
         * Reference implementation: https://git.io/Jt24C
         *
         * @param tipsetKey - A normal Lotus node accepts an optional
         * parameter of the TipsetKey to refer to the pending messages.
         * However, with the design of Filecoin-flavored Ganache, this
         * parameter is not used in Ganache.
         * @param ticketQuality - Since all messages are included in the next
         * block in Ganache, this number is ignored. A normal Lotus node uses
         * this number to help determine which messages are going to be included
         * in the next block. This parameter is also not used in Ganache.
         *
         * @returns
         */
        "Filecoin.MpoolSelect"(tipsetKey: Array<RootCID>, ticketQuality: number): Promise<Array<SerializedSignedMessage>>;
        /**
         * Returns the miner actor address for the Filecoin-flavored
         * Ganache node. This value is always the same and doesn't change.
         *
         * @returns `t01000`
         */
        "Filecoin.ActorAddress"(): Promise<string>;
        /**
         * Returns a list of the miner addresses for the
         * Filecoin-flavored Ganache. Ganache always has
         * the same single miner.
         *
         * @returns `[ "t01000" ]`
         */
        "Filecoin.StateListMiners"(): Promise<Array<string>>;
        /**
         * Returns the miner power of a given miner address.
         *
         * "A storage miner's storage power is a value roughly proportional
         * to the amount of storage capacity they make available on behalf
         * of the network via capacity commitments or storage deals."
         * From: https://docs.filecoin.io/reference/glossary/#storage-power
         *
         * Since Ganache is currently only supporting 1 miner per Ganache
         * instance, then it will have a raw byte power of 1n and everything else will
         * have 0n. This indicates the supported miner contains all of the storage
         * power for the entire network (which is true). Any number would do, so we'll
         * stick with 1n.
         *
         * Quality adjusted power will be 0n always as relative
         * power doesn't change:
         * "The storage power a storage miner earns from a storage deal offered by a
         * verified client will be augmented by a multiplier."
         * https://docs.filecoin.io/reference/glossary/#quality-adjusted-storage-power
         *
         * @param minerAddress - The miner address to get miner power for.
         * @returns The MinerPower object.
         */
        "Filecoin.StateMinerPower"(minerAddress: string): Promise<SerializedMinerPower>;
        /**
         * Returns the miner info for the given miner address.
         *
         * @param minerAddress -
         * @param tipsetKey - A normal Lotus node uses tipsetKey to get the
         * miner info at that Tipset. However, the miner info in
         * Filecoin-flavored Ganache will not change based on the tipset,
         * so this parameter is ignored by Ganache.
         * @returns The MinerInfo object.
         */
        "Filecoin.StateMinerInfo"(minerAddress: string, tipsetKey: Array<RootCID>): Promise<SerializedMinerInfo>;
        /**
         * Returns the default address of the wallet; this is also the first address
         * that is returned in `Filecoin.WalletList`.
         *
         * @returns A `string` of the public address.
         */
        "Filecoin.WalletDefaultAddress"(): Promise<SerializedAddress>;
        /**
         * Sets the default address to the provided address. This will move the
         * address from its current position in the `Filecoin.WalletList` response
         * to the front of the array. This change is persisted across Ganache sessions
         * if you are using a persisted database with `database.db` or
         * `database.dbPath` options.
         *
         * @param address - The public address to set as the default address. Must be an address
         * that is in the wallet; see `Filecoin.WalletList` to get a list of addresses
         * in the wallet.
         */
        "Filecoin.WalletSetDefault"(address: string): Promise<void>;
        /**
         * Returns the balance of any address.
         *
         * @param address - The public address to retrieve the balance for.
         * @returns A `string` of the `attoFIL` balance of `address`,
         * encoded in base-10 (aka decimal format).
         */
        "Filecoin.WalletBalance"(address: string): Promise<string>;
        /**
         * Generate a new random address to add to the wallet. This new
         * address is persisted across Ganache sessions if you are using
         * a persisted database with `database.db` or `database.dbPath` options.
         *
         * @param keyType - The key type (`bls` or `secp256k1`) to use
         * to generate the address. KeyType of `secp256k1-ledger` is
         * not supported in Filecoin-flavored Ganache.
         * @returns The public address as a `string`.
         */
        "Filecoin.WalletNew"(keyType: KeyType): Promise<SerializedAddress>;
        /**
         * Returns the list of addresses in the wallet. The wallet stores the private
         * key of these addresses and therefore can sign messages and random bytes.
         *
         * @returns An array of `string`'s of each public address in the wallet.
         */
        "Filecoin.WalletList"(): Promise<Array<SerializedAddress>>;
        /**
         * Checks whether or not the wallet includes the provided address.
         *
         * @param address - The public address of type `string` to check.
         * @returns `true` if the address is in the wallet, `false` otherwise.
         */
        "Filecoin.WalletHas"(address: string): Promise<boolean>;
        /**
         * Removes the address from the wallet. This method is unrecoverable.
         * If you want to recover the address removed from this method, you
         * must use `Filecoin.WalletImport` with the correct private key.
         * Removing addresses from the wallet will persist between Ganache
         * sessions if you are using a persisted database with
         * `database.db` or `database.dbPath` options.
         *
         * @param address - A `string` of the public address to remove.
         */
        "Filecoin.WalletDelete"(address: string): Promise<void>;
        /**
         * Exports the private key information from an address stored in the wallet.
         *
         * @param address - A `string` of the public address to export.
         * @returns The KeyInfo object.
         */
        "Filecoin.WalletExport"(address: string): Promise<SerializedKeyInfo>;
        /**
         * Imports an address into the wallet with provided private key info.
         * Use this method to add more addresses to the wallet. Adding addresses
         * to the wallet will persist between Ganache sessions if you are using
         * a persisted database with with `database.db` or `database.dbPath` options.
         *
         * @param serializedKeyInfo - The private key KeyInfo object for the address to import.
         * @returns The corresponding public address of type `string`.
         */
        "Filecoin.WalletImport"(serializedKeyInfo: SerializedKeyInfo): Promise<SerializedAddress>;
        /**
         * Signs an arbitrary byte string using the private key info
         * stored in the wallet.
         *
         * @param address - A `string` of the public address in the wallet to
         * sign with.
         * @param data - A `string` of a base-64 encoded byte array to sign.
         * @returns A Signature object which contains the signature details.
         */
        "Filecoin.WalletSign"(address: string, data: string): Promise<SerializedSignature>;
        /**
         * Signs a Message using the private key info stored in the wallet.
         *
         * @param address - A `string` of the public address in the wallet to
         * sign with.
         * @param serializedMessage - A Message object that needs signing.
         * @returns The corresponding SignedMessage object.
         */
        "Filecoin.WalletSignMessage"(address: string, serializedMessage: SerializedMessage): Promise<SerializedSignedMessage>;
        /**
         * Verifies the validity of a signature for a given address
         * and unsigned byte string.
         *
         * @param inputAddress - A `string` of the public address that
         * supposedly signed `data` with `serializedSignature`
         * @param data - A `string` of the data that was signed, encoded
         * in base-64.
         * @param serializedSignature - A Signature object of the signature
         * you're trying to verify.
         * @returns `true` if valid, `false` otherwise.
         */
        "Filecoin.WalletVerify"(inputAddress: string, data: string, serializedSignature: SerializedSignature): Promise<boolean>;
        /**
         * Checks the validity of a given public address.
         *
         * @param inputAddress - The `string` of the public address to check.
         * @returns If successful, it returns the address back as a `string`.
         * Otherwise returns an error.
         */
        "Filecoin.WalletValidateAddress"(inputAddress: string): Promise<SerializedAddress>;
        /**
         * Start a storage deal. The data must already be uploaded to
         * the Ganache IPFS node. Deals are automatically accepted
         * as long as the public address in `Wallet` is in Ganache's
         * wallet (see `Filecoin.WalletList` or `Filecoin.WalletHas`
         * to check). Storage deals in Ganache automatically progress
         * each tipset from one state to the next towards the
         * StorageDealStatusActive state.
         *
         * @param serializedProposal - A StartDealParams object of the deal details.
         * @returns The RootCID of the new `DealInfo` =\> `DealInfo.ProposalCid`
         */
        "Filecoin.ClientStartDeal"(serializedProposal: SerializedStartDealParams): Promise<SerializedRootCID>;
        /**
         * List all storage deals regardless of state, including expired deals.
         *
         * @returns An array of DealInfo objects.
         */
        "Filecoin.ClientListDeals"(): Promise<Array<SerializedDealInfo>>;
        /**
         * Get the detailed info of a storage deal.
         *
         * Reference implementation: https://git.io/JthfU
         *
         * @param serializedCid - The `DealInfo.ProposalCid` RootCID for the
         * deal you're searching for
         * @returns A DealInfo object.
         */
        "Filecoin.ClientGetDealInfo"(serializedCid: SerializedRootCID): Promise<SerializedDealInfo>;
        /**
         * Get the corresponding string that represents a StorageDealStatus
         * code.
         *
         * Reference implementation: https://git.io/JqUXg
         *
         * @param statusCode - A `number` that's stored in `DealInfo.State`
         * which represents the current state of a storage deal.
         * @returns A `string` representation of the provided `statusCode`.
         */
        "Filecoin.ClientGetDealStatus"(statusCode: number): Promise<string>;
        /**
         * Starts a subscription to receive updates when storage deals
         * change state.
         *
         * @param rpcId - This parameter is not provided by the user, but
         * injected by the internal system.
         * @returns An object with the subscription ID and an unsubscribe
         * function.
         */
        "Filecoin.ClientGetDealUpdates"(rpcId?: string): PromiEvent<Subscription>;
        /**
         * Ask the node to search for data stored in the IPFS node.
         *
         * @param rootCid - The RootCID to search for.
         * @returns A QueryOffer with details of the data for further
         * retrieval.
         */
        "Filecoin.ClientFindData"(rootCid: SerializedRootCID): Promise<Array<SerializedQueryOffer>>;
        /**
         * Returns whether or not the local IPFS node has the data
         * requested. Since Filecoin-flavored Ganache doesn't connect
         * to any external networks, all data on the IPFS node is local.
         *
         * @param rootCid - The RootCID to serach for.
         * @returns `true` if the local IPFS node has the data,
         * `false` otherwise.
         */
        "Filecoin.ClientHasLocal"(rootCid: SerializedRootCID): Promise<boolean>;
        /**
         * Download the contents of a storage deal to disk (local
         * to Ganache).
         *
         * @param retrievalOrder - A RetrievalOrder object detailing
         * the deal, retrieval price, etc.
         * @param ref - A FileRef object specifying where the file
         * should be saved to.
         */
        "Filecoin.ClientRetrieve"(retrievalOrder: SerializedRetrievalOrder, ref: SerializedFileRef): Promise<void>;
        /**
         * Manually mine a tipset immediately. Mines even if the
         * miner is disabled.
         *
         * @returns The Tipset object that was mined.
         */
        "Ganache.MineTipset"(): Promise<SerializedTipset>;
        /**
         * Enables the miner.
         */
        "Ganache.EnableMiner"(): Promise<void>;
        /**
         * Disables the miner.
         */
        "Ganache.DisableMiner"(): Promise<void>;
        /**
         * The current status on whether or not the miner
         * is enabled. The initial value is determined by
         * the option `miner.mine`. If `true`, then auto-mining
         * (`miner.blockTime = 0`) and interval mining
         * (`miner.blockTime > 0`) will be processed.
         * If `false`, tipsets/blocks will only be mined with
         * `Ganache.MineTipset`
         *
         * @returns A `boolean` on whether or not the miner is
         * enabled.
         */
        "Ganache.MinerEnabled"(): Promise<boolean>;
        /**
         * A subscription method that provides an update
         * whenever the miner is enabled or disabled.
         *
         * @param rpcId - This parameter is not provided by the user, but
         * injected by the internal system.
         * @returns An object with the subscription ID and an unsubscribe
         * function.
         */
        "Ganache.MinerEnabledNotify"(rpcId?: string): PromiEvent<Subscription>;
        /**
         * Retrieves an internal `DealInfo` by its `DealID`.
         *
         * @param dealId - A `number` corresponding to the `DealInfo.DealID`
         * for the deal to retrieve.
         * @returns The matched DealInfo object.
         */
        "Ganache.GetDealById"(dealId: number): Promise<SerializedDealInfo>;
    }

    declare type FilecoinConfig = {
        chain: ChainConfig_3;
        database: DatabaseConfig_2;
        logging: LoggingConfig_2;
        miner: MinerConfig_2;
        wallet: WalletConfig_2;
    };

    declare const FilecoinFlavorName = "filecoin";

    declare type FilecoinInternalOptions = {
        [K in keyof FilecoinConfig]: InternalConfig<FilecoinConfig[K]>;
    };

    declare type FilecoinLegacyProviderOptions = Partial<MakeLegacyOptions_2<ChainConfig_3> & MakeLegacyOptions_2<LoggingConfig_2> & MakeLegacyOptions_2<MinerConfig_2> & MakeLegacyOptions_2<WalletConfig_2>>;

    declare type FilecoinOptions<T = "filecoin"> = {
        flavor: T;
    } & (FilecoinProviderOptions | FilecoinLegacyProviderOptions);

    export declare type FilecoinProvider = ConnectorsByName["filecoin"];

    declare class FilecoinProvider_2<R extends JsonRpcRequest<FilecoinApi, KnownKeys<FilecoinApi>> = JsonRpcRequest<FilecoinApi, KnownKeys<FilecoinApi>>> extends Emittery<{
        connect: undefined;
        disconnect: undefined;
    }> implements Provider_2<FilecoinApi> {
        #private;
        readonly blockchain: Blockchain_3;
        static readonly Schema: Schema;
        constructor(options: Partial<{
            chain: Partial<{
                ipfsHost: string;
                ipfsPort: number;
                asyncRequestProcessing: boolean;
            }>;
            database: Partial<{
                db: string | object;
                dbPath?: undefined;
            } | {
                dbPath: string;
                db?: undefined;
            }>;
            logging: Partial<{
                logger: {
                    log(message?: any, ...optionalParams: any[]): void;
                };
            }>;
            miner: Partial<{
                blockTime: number;
                mine: boolean;
            }>;
            wallet: Partial<{
                deterministic: boolean;
                seed?: undefined;
                totalAccounts: number;
                defaultBalance: number;
            } | {
                seed: string;
                deterministic?: undefined;
                totalAccounts: number;
                defaultBalance: number;
            }>;
        }> | undefined, executor: Executor);
        initialize(): Promise<void>;
        /**
         * Returns the options, including defaults and generated, used to start Ganache.
         */
        getOptions(): FilecoinInternalOptions;
        /**
         * Returns the unlocked accounts
         */
        getInitialAccounts(): Promise<Record<string, {
            unlocked: boolean;
            secretKey: string;
            balance: bigint;
        }>>;
        connect(): Promise<void>;
        send(payload: R): Promise<any>;
        _requestRaw<Method extends keyof FilecoinApi = keyof FilecoinApi>(payload: R): Promise<{
            value: PromiseLike<ReturnType<FilecoinApi[Method]>> | PromiEvent<any>;
        }>;
        sendHttp(): Promise<void>;
        sendWs(): Promise<void>;
        sendSubscription(payload: R, schemaMethod: {
            subscription?: boolean;
        }, subscriptionCallback: (data: any) => void): Promise<((() => void) | Promise<string | null>)[]>;
        receive(): Promise<void>;
        import(): Promise<void>;
        destroy(): Promise<void>;
        stop(): Promise<void>;
    }

    declare type FilecoinProviderOptions = Partial<{
        [K in keyof FilecoinConfig]: ExternalConfig<FilecoinConfig[K]>;
    }>;

    declare class FileRef extends SerializableObject<FileRefConfig> implements DeserializedObject<FileRefConfig> {
        get config(): Definitions<FileRefConfig>;
        constructor(options?: Partial<SerializedObject<FileRefConfig>> | Partial<DeserializedObject<FileRefConfig>>);
        path: string;
        isCAR: boolean;
    }

    declare type FileRefConfig = {
        properties: {
            path: {
                type: string;
                serializedType: string;
                serializedName: "Path";
            };
            isCAR: {
                type: boolean;
                serializedType: boolean;
                serializedName: "IsCAR";
            };
        };
    };

    declare type FilterArgs = BlockHashFilterArgs | RangeFilterArgs;

    declare enum FilterTypes {
        log = 0,
        block = 1,
        pendingTransaction = 2
    }

    /**
     * Since our types come from all over the place and get smushed together and
     * pulled apart, we "Flatten" (there is probably a
     * better word) these type complexities by using a TypeScript trick:
     * `Pick<T, keyof T>`. This picks all the keys (and their values) from T,
     * resulting in the same type shape, but the intermediate types are all skipped
     * and intersections are simplified.
     *
     * ```
     * type SomeTypes = {prop: string, prop2: number};
     * type Thing = Omit<SomeTypes, "prop2"> & {addProp: true};
     * ```
     * gets turned into
     * ```
     * type Thing = {prop: string, addProp: true}
     * ```
     */
    declare type Flatten<T> = Pick<T, keyof T>;

    declare type FlattenUnion<T> = {
        [K in keyof UnionToIntersection_2<T>]: K extends keyof T ? T[K] extends any[] ? T[K] : T[K] extends object ? FlattenUnion<T[K]> : T[K] : UnionToIntersection_2<T>[K];
    };

    declare type FlavorName = keyof ConnectorsByName;

    declare type FlavorOptions<T extends "filecoin" | "ethereum"> = T extends "filecoin" ? FilecoinOptions<T> : T extends "ethereum" ? EthereumOptions<T> : never;

    declare class Fork {
        #private;
        common: Common;
        blockNumber: Quantity;
        stateRoot: Data;
        block: Block;
        chainId: number;
        constructor(options: EthereumInternalOptions, accounts: Account[]);
        initialize(): Promise<void>;
        private initCache;
        request<T = unknown>(method: string, params: unknown[], options?: {
            disableCache: boolean;
        }): Promise<T>;
        abort(): void;
        close(): Promise<void>;
        isValidForkBlockNumber(blockNumber: Quantity): boolean;
        selectValidForkBlockNumber(blockNumber: Quantity): Quantity;
        /**
         * If the `blockNumber` is before our `fork.blockNumber`, return a `Common`
         * instance, applying the rules from the remote chain's `common` via its
         * original `chainId`. If the remote chain's `chainId` is now "known", return
         * a `Common` with our local `common`'s rules applied, but with the remote
         * chain's `chainId`. If the block is greater than or equal to our
         * `fork.blockNumber` return `common`.
         * @param common -
         * @param blockNumber -
         */
        getCommonForBlockNumber(common: Common, blockNumber: BigInt): Common;
    }

    declare type ForkConfig = {
        options: {
            /**
             * Fork from another currently running Ethereum client. Input should be the
             * URL of the node, e.g. http://localhost:8545. You can optionally specify
             * the block to fork from using an \@ sign: http://localhost:8545\@1599200
             *
             * You can specify Basic Authentication credentials in the URL as well. e.g.,
             * wss://user:password\@example.com/. If you need to use an Infura Project
             * Secret, you would use it like this: wss://:\{YOUR-PROJECT-SECRET\}\@mainnet.infura.com/...
             *
             * Alternatively, you can use the `fork.username` and `fork.password` options.
             */
            url: {
                type: ForkUrl;
                rawType: string;
                legacy: {
                    /**
                     * @deprecated Use fork.url instead
                     */
                    fork: string | object;
                };
            };
            /**
             * Specify an EIP-1193 provider to use instead of a url.
             */
            provider: {
                type: {
                    request: (args: {
                        readonly method: string;
                        readonly params?: readonly unknown[] | object;
                    }) => Promise<unknown>;
                };
                legacy: {
                    /**
                     * @deprecated Use fork.provider instead
                     */
                    fork: {
                        readonly method: string;
                        readonly params?: readonly unknown[] | object;
                    };
                };
            };
            network: {
                type: KnownNetworks;
                legacy: {
                    /**
                     * @deprecated Use fork.provider instead
                     */
                    fork: KnownNetworks;
                };
            };
            /**
             * Block number the provider should fork from.
             */
            blockNumber: {
                type: number | typeof Tag.latest;
                hasDefault: true;
                legacy: {
                    /**
                     * @deprecated Use fork.blockNumber instead
                     */
                    fork_block_number: number | typeof Tag.latest;
                };
            };
            /**
             * When the `fork.blockNumber` is set to "latest" (default), the number of
             * blocks before the remote node's "latest" block to fork from.
             */
            preLatestConfirmations: {
                type: number;
                hasDefault: true;
            };
            /**
             * Username to use for Basic Authentication. Does not require setting `fork.password`.
             *
             * When combined with `fork.password`, is shorthand for `fork: { headers: { "Authorization": "Basic {ENCODED-BASIC-HEADER}" } }`
             *
             * If the `fork.headers` option specifies an "Authorization" header, it will be be inserted _after_ this Basic token.
             */
            username: {
                type: string;
                hasDefault: true;
            };
            /**
             * Password to use for Basic Authentication. Does not require setting `fork.username`.
             *
             * When combined with `fork.username`, is shorthand for `fork: { headers: { "Authorization": "Basic {ENCODED-BASIC-HEADER}" } }`
             *
             * If the `fork.headers` option specifies an "Authorization" header, it will be be inserted _after_ this Basic token.
             */
            password: {
                type: string;
                hasDefault: true;
            };
            /**
             * _Encoded_ JSON Web Token (JWT) used for authenticating to some servers.
             *
             * Shorthand for `fork: { headers: { "Authorization": "Bearer {YOUR-ENCODED-JWT}" } }`
             *
             * If the `fork.headers` option specifies an "Authorization" header, it will be be inserted _after_ the JWT Bearer token.
             */
            jwt: {
                type: string;
            };
            /**
             * The User-Agent header sent to the fork on each request.
             *
             * Sent as Api-User-Agent when used in the browser.
             *
             * Will be overridden by a `"User-Agent"` value defined in the `fork.headers` option, if provided.
             *
             * @defaultValue "Ganache/VERSION (https://www.trufflesuite.com/ganache; ganache＠trufflesuite.com) ＠ganache/ethereum/VERSION"
             */
            userAgent: {
                type: string;
                hasDefault: true;
            };
            /**
             * The Origin header sent to the fork on each request.
             *
             * Ignored in the browser.
             *
             * Will be overridden by an `"Origin"` value defined in the `fork.headers` option, if provided.
             */
            origin: {
                type: string;
            };
            /**
             * Headers to supply on each request to the forked provider.
             *
             * Headers set here override headers set by other options, unless otherwise specified.
             *
             * @defaultValue
             * ```json
             * [{
             *   "name": "User-Agent",
             *   "value": "Ganache/VERSION (https://www.trufflesuite.com/ganache; ganache<at>trufflesuite.com)"
             * }]
             * ```
             */
            headers: {
                type: HeaderRecord[];
                cliType: string[];
            };
            /**
             * Limit the number of requests per second sent to the fork provider. `0` means no limit is applied.
             *
             * @defaultValue 0
             */
            requestsPerSecond: {
                type: number;
                hasDefault: true;
            };
            /**
             * Disables caching of all forking requests.
             *
             * @defaultValue false
             */
            disableCache: {
                type: boolean;
                hasDefault: true;
            };
            /**
             * Deletes the persistent cache on start up.
             *
             * @defaultValue false
             */
            deleteCache: {
                type: boolean;
                hasDefault: true;
            };
        };
        exclusiveGroups: [["url", "provider", "network"]];
    };

    declare class ForkTrie extends GanacheTrie {
        private accounts;
        private address;
        private isPreForkBlock;
        private forkBlockNumber;
        blockNumber: Quantity;
        private checkpointedMetadata;
        /** The underlying database for `checkpointedMetadata */
        private metadataDB;
        constructor(db: TrieDB | null, root: Buffer, blockchain: Blockchain);
        checkpoint(): void;
        commit(): Promise<void>;
        revert(): Promise<void>;
        setContext(stateRoot: Buffer, address: Buffer, blockNumber: Quantity): void;
        put(key: Buffer, val: Buffer): Promise<void>;
        /**
         * Removes saved metadata from the given block range (inclusive)
         * @param startBlockNumber - (inclusive)
         * @param endBlockNumber - (inclusive)
         */
        revertMetaData(startBlockNumber: Quantity, endBlockNumber: Quantity): Promise<void>;
        private createDelKey;
        /**
         * Checks if the key was deleted (locally -- not on the fork)
         * @param key -
         */
        private keyWasDeleted;
        del(key: Buffer): Promise<void>;
        /**
         * Gets an account from the fork/fallback.
         *
         * @param address - the address of the account
         * @param blockNumber - the block number at which to query the fork/fallback.
         * @param stateRoot - the state root at the given blockNumber
         */
        private accountFromFallback;
        private storageFromFallback;
        get(key: Buffer): Promise<Buffer>;
        /**
         * Returns a copy of the underlying trie with the interface of ForkTrie.
         * @param includeCheckpoints - If true and during a checkpoint, the copy will
         * contain the checkpointing metadata and will use the same scratch as
         * underlying db.
         */
        copy(includeCheckpoints?: boolean): ForkTrie;
    }

    declare type ForkUrl = URL & {
        _blockNumber?: number | typeof Tag.latest;
    };

    declare type FoundNodeFunction = (nodeRef: Buffer, node: TrieNode | null, key: Nibbles, walkController: WalkController) => void;

    /**
     * @public
     */
    declare const Ganache: {
        /**
         * Creates a Ganache server instance that creates and
         * serves an underlying Ganache provider. Initialization
         * doesn't begin until `server.listen(...)` is called.
         * `server.listen(...)` returns a promise that resolves
         * when initialization is finished.
         *
         * @param options - Configuration options for the server;
         * `options` includes provider based options as well.
         * @returns A provider instance for the flavor
         * `options.flavor` which defaults to `ethereum`.
         */
        server: <T extends keyof ConnectorsByName = "ethereum">(options?: ServerOptions<T>) => Server<T>;
        /**
         * Initializes a Web3 provider for a Ganache instance.
         * This function starts an asynchronous task, but does not
         * finish it by the time the function returns. Listen to
         * `provider.on("connect", () => {...})` or wait for
         * `await provider.once("connect")` for initialization to
         * finish. You may start sending requests to the provider
         * before initialization finishes however; these requests
         * will start being consumed after initialization finishes.
         *
         * @param options - Configuration options for the provider.
         * @returns A provider instance for the flavor
         * `options.flavor` which defaults to `ethereum`.
         */
        provider: <Flavor extends keyof ConnectorsByName = "ethereum">(options?: FlavorOptions<Flavor>) => ConnectorsByName[Flavor]["provider"];
        /**
         *
         * @experimental
         */
        __experimental_info(): _ExperimentalInfo;
    };
    export default Ganache;

    declare type GanacheLevelUp = LevelUp<AbstractLevelDOWN<Buffer, Buffer>, AbstractIterator<Buffer, Buffer>>;

    /**
     * Meta data Ganache stores as part of a transaction *in a block*
     */
    declare type GanacheRawBlockTransactionMetaData = [from: Buffer, hash: Buffer];

    /**
     * Extra data Ganache stores as part of a transaction in order to support
     * account masquerading and quick lookups for transactions, blocks, and receipts.
     */
    declare type GanacheRawExtraTx = [
    from: Buffer,
    hash: Buffer,
    blockHash: Buffer,
    blockNumber: Buffer,
    index: Buffer,
    effectiveGasPrice?: Buffer
    ];

    declare class GanacheTrie extends Trie {
        readonly blockchain: Blockchain;
        /**
         * The database that's returned from this.database() does not have all of
         * the types of the original input database because ethereumjs doesn't use
         * generics for their types in the underlying `CheckpointDB`. So, we store the
         * original db on our trie so we can access those types.
         */
        readonly db: TrieDB;
        constructor(db: TrieDB, root: Buffer, blockchain: Blockchain);
        setContext(stateRoot: Buffer, address: Buffer, blockNumber: Quantity): void;
        /**
         * Returns a copy of the underlying trie with the interface of GanacheTrie.
         * @param includeCheckpoints - If true and during a checkpoint, the copy will contain the checkpointing metadata and will use the same scratch as underlying db.
         */
        copy(includeCheckpoints?: boolean): GanacheTrie;
    }

    /**
     * Returned if a transaction's requested gas limit exceeds the maximum allowance of the current block.
     */
    declare const GAS_LIMIT = "exceeds block gas limit";

    declare interface GenesisBlockConfig {
        timestamp?: string;
        gasLimit: number;
        difficulty: number;
        nonce: string;
        extraData: string;
        baseFeePerGas?: string;
    }

    declare interface GenesisState {
        [key: PrefixedHexString]: PrefixedHexString | AccountState;
    }

    declare function getEncryptionPublicKey(privateKey: string): string;

    declare interface GethConfigOpts {
        chain?: string;
        hardfork?: string | Hardfork_2;
        genesisHash?: Buffer;
    }

    declare type Hardfork = Writeable<ArrayToTuple<typeof HARDFORKS>>;

    declare enum Hardfork_2 {
        Chainstart = "chainstart",
        Homestead = "homestead",
        Dao = "dao",
        TangerineWhistle = "tangerineWhistle",
        SpuriousDragon = "spuriousDragon",
        Byzantium = "byzantium",
        Constantinople = "constantinople",
        Petersburg = "petersburg",
        Istanbul = "istanbul",
        MuirGlacier = "muirGlacier",
        Berlin = "berlin",
        London = "london",
        ArrowGlacier = "arrowGlacier",
        GrayGlacier = "grayGlacier",
        MergeForkIdTransition = "mergeForkIdTransition",
        Merge = "merge",
        Shanghai = "shanghai"
    }

    declare type Hardfork_3 = "constantinople" | "byzantium" | "petersburg" | "istanbul" | "muirGlacier" | "berlin" | "london" | "arrowGlacier" | "grayGlacier" | "merge";

    declare interface HardforkConfig {
        name: Hardfork_2 | string;
        block: number | null;
        ttd?: bigint | string;
        forkHash?: string | null;
    }

    declare const HARDFORKS: readonly ["constantinople", "byzantium", "petersburg", "istanbul", "muirGlacier", "berlin", "london", "arrowGlacier", "grayGlacier", "merge"];

    declare type HashKeysFunction = (msg: Uint8Array) => Uint8Array;

    declare const hasPartialSignature: (data: Transaction) => data is Transaction & {
        from?: string;
        v?: string;
        r?: string;
        s?: string;
    };

    /**
     * A block header's data.
     */
    declare interface HeaderData {
        parentHash?: BufferLike;
        uncleHash?: BufferLike;
        coinbase?: AddressLike;
        stateRoot?: BufferLike;
        transactionsTrie?: BufferLike;
        receiptTrie?: BufferLike;
        logsBloom?: BufferLike;
        difficulty?: BigIntLike;
        number?: BigIntLike;
        gasLimit?: BigIntLike;
        gasUsed?: BigIntLike;
        timestamp?: BigIntLike;
        extraData?: BufferLike;
        mixHash?: BufferLike;
        nonce?: BufferLike;
        baseFeePerGas?: BigIntLike;
    }

    declare type HeaderRecord = {
        name: string;
        value: string;
    };

    declare class Heap<T, U = any> {
        length: number;
        array: T[];
        protected less: Comparator<T>;
        protected refresher: (item: T, context: U) => void;
        /**
         * Creates a priority-queue heap where the highest priority element,
         * as determined by the `less` function, is at the tip/root of the heap.
         * To read the highest priority element without removing it call peek(). To
         * read and remove the element call `shift()`
         * @param less - the comparator function
         * @param refresher - the refresher function
         */
        constructor(less: Comparator<T>, refresher?: (item: T, context: U) => void);
        init(array: T[]): void;
        /**
         * Updates all entries by calling the Heap's `refresher` function for each
         * item in the heap and then re-sorting.
         * @param context -
         */
        /**
         * Updates all entries by calling the Heap's `refresher` function for each
         * item in the heap and then re-sorting.
         * @param context -
         */
        refresh(context: U): void;
        /**
         * Pushes a new element onto the heap
         * @param value -
         */
        push(value: T): void;
        size(): number;
        /**
         * Return the current best element. Does not remove it
         */
        peek(): T;
        clear(): void;
        /**
         * Removes and returns the element with the highest priority from the heap.
         * The complexity is O(log n) where n = this.size().
         * @returns the element with the highest priority. returns `undefined` if
         * there are no more elements in the heap.
         */
        shift(): T | undefined;
        /**
         * Removes the highest priority element from the queue, replacing it with
         * the new element. This is equivalent to, but faster than, calling
         * `replace(0, newValue);`.
         * If you call this on an empty heap (`this.size() === 0`) you may find
         * unexpected behavior.
         * @param newValue -
         */
        replaceBest(newValue: T): void;
        /**
         * Replaces the element at position `i` with the `newValue`. If the element at
         * position `i` doesn't exist, or if `i < 0` or `i > this.size()` you may
         * find unexpected behavior.
         * @param i -
         * @param newValue -
         */
        replace(i: number, newValue: T): void;
        /**
         * Removes the element at position `i`.
         * The complexity is O(log n) where n = this.size().
         * @param i - the element to remove
         */
        remove(i: number): void;
        /**
         * Removes the element with the highest priority from the heap
         * The complexity is O(log n) where n = this.size().
         * @returns `true` when there are more elements in the queue, `false` when the
         * last element was just removed. Calling `removeBest` when there are no more
         * elements in the queue will return `true`. So don't do that.
         */
        removeBest(): boolean;
        /**
         * Re-establishes the heap ordering after the element at index `i` changes
         * its value. Changing the value of the element at index `i` and then
         * calling fix is equivalent to, but faster than, calling
         * `remove(i); push(newValue);`.
         * The complexity is O(log n) where n = this.size().
         * @param i -
         */
        fix(i: number): void;
        private up;
        private down;
        /**
         * Swaps the elements in the heap
         * @param i - The first element
         * @param j - The second element
         */
        private swap;
        /**
         * Heap initialization helper for when you only know of a single item for the
         * heap.
         * @param item -
         * @param less -
         * @param refresher -
         */
        static from<T, U>(item: T, less: Comparator<T>, refresher?: (item: T, context: U) => void): Heap<T, U>;
    }

    declare type HexChar = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "a" | "b" | "c" | "d" | "e" | "f";

    declare type HexPair = `${oneThroughSeven}${HexChar}`;

    /** An HttpRequest is stack allocated and only accessible during the callback invocation. */
    declare interface HttpRequest {
        /** Returns the lowercased header value or empty string. */
        getHeader(lowerCaseKey: RecognizedString) : string;
        /** Returns the parsed parameter at index. Corresponds to route. */
        getParameter(index: number) : string;
        /** Returns the URL including initial /slash */
        getUrl() : string;
        /** Returns the HTTP method, useful for "any" routes. */
        getMethod() : string;
        /** Returns the raw querystring (the part of URL after ? sign) or empty string. */
        getQuery() : string;
        /** Returns a decoded query parameter value or empty string. */
        getQuery(key: string) : string;
        /** Loops over all headers. */
        forEach(cb: (key: string, value: string) => void) : void;
        /** Setting yield to true is to say that this route handler did not handle the route, causing the router to continue looking for a matching route handler, or fail. */
        setYield(yield: boolean) : HttpRequest;
    }

    declare type InferDBClear<DB> =
    DB extends { clear: (options: infer O, callback: ErrorCallback) => void } ?
    LevelUpClear<O> :
    LevelUpClear<AbstractClearOptions>;

    declare type InferDBDel<DB> =
    DB extends { del: (key: infer K, options: infer O, callback: ErrorCallback) => void } ?
    LevelUpDel<K, O> :
    LevelUpDel<any, AbstractOptions>;

    declare type InferDBGet<DB> =
    DB extends { get: (key: infer K, options: infer O, callback: ErrorValueCallback<infer V>) => void } ?
    LevelUpGet<K, V, O> :
    LevelUpGet<any, any, AbstractGetOptions>;

    declare type InferDBGetMany<DB> =
    DB extends { getMany: (keys: Array<infer K>, options: infer O, callback: ErrorValueCallback<Array<infer V>>) => void } ?
    LevelUpGetMany<K, V, O> :
    LevelUpGetMany<any, any, AbstractGetOptions>;

    declare type InferDBPut<DB> =
    DB extends { put: (key: infer K, value: infer V, options: infer O, cb: any) => void } ?
    LevelUpPut<K, V, O> :
    LevelUpPut<any, any, AbstractOptions>;

    declare class InitializationError extends LevelUPError {}

    declare const inspect: unique symbol;

    declare type Instantiable<T> = {
        new (...args: any[]): T;
    };

    declare type Instantiable_2<T> = {
        new (...args: any[]): T;
    };

    /**
     * Returned if a transaction may require more funds than than account currently has available.
     */
    declare const INSUFFICIENT_FUNDS = "insufficient funds for gas * price + value";

    declare type InternalConfig<C extends Base.Config> = ExclusiveGroupUnionAndUnconstrainedPlus<C, "type">;

    declare type InternalFilter = {
        type: FilterTypes;
        updates: Data[];
        unsubscribe: Emittery.UnsubscribeFn;
        filter: FilterArgs;
    };

    declare enum InternalTag {
        earliest = "earliest",
        finalized = "finalized",
        latest = "latest",
        safe = "safe",
        pending = "pending"
    }

    declare class InternalTransactionReceipt {
        #private;
        contractAddress: Buffer;
        gasUsed: Buffer;
        raw: EthereumRawReceipt;
        encoded: {
            length: number;
            output: Buffer[];
        };
        txType: Quantity;
        constructor(data?: Buffer);
        static fromValues(status: Buffer, cumulativeGasUsed: Buffer, logsBloom: Buffer, logs: TransactionLog[], gasUsed: Buffer, contractAddress: Buffer, type?: Quantity): InternalTransactionReceipt;
        serialize(all: boolean): Buffer;
        toJSON(block: {
            hash(): Data;
            header: {
                number: Quantity;
                baseFeePerGas?: Quantity;
            };
        }, transaction: TypedTransaction, common: Common): TransactionReceipt;
    }

    /**
     * Parses and executes EVM bytecode.
     */
    declare class Interpreter {
        protected _vm: any;
        protected _runState: RunState;
        protected _eei: EEIInterface;
        protected _common: Common;
        protected _evm: EVM;
        _env: Env;
        _result: RunResult;
        private opDebuggers;
        constructor(evm: EVM, eei: EEIInterface, env: Env, gasLeft: bigint);
        run(code: Buffer, opts?: InterpreterOpts): Promise<InterpreterResult>;
        /**
         * Executes the opcode to which the program counter is pointing,
         * reducing its base gas cost, and increments the program counter.
         */
        runStep(): Promise<void>;
        /**
         * Get the handler function for an opcode.
         */
        getOpHandler(opInfo: Opcode): OpHandler;
        /**
         * Get info for an opcode from EVM's list of opcodes.
         */
        lookupOpInfo(op: number): Opcode;
        _runStepHook(dynamicFee: bigint, gasLeft: bigint): Promise<void>;
        _getValidJumpDests(code: Buffer): Uint8Array;
        /**
         * Logic extracted from EEI
         */
        /**
         * Subtracts an amount from the gas counter.
         * @param amount - Amount of gas to consume
         * @param context - Usage context for debugging
         * @throws if out of gas
         */
        useGas(amount: bigint, context?: string): void;
        /**
         * Adds a positive amount to the gas counter.
         * @param amount - Amount of gas refunded
         * @param context - Usage context for debugging
         */
        refundGas(amount: bigint, context?: string): void;
        /**
         * Reduces amount of gas to be refunded by a positive value.
         * @param amount - Amount to subtract from gas refunds
         * @param context - Usage context for debugging
         */
        subRefund(amount: bigint, context?: string): void;
        /**
         * Increments the internal gasLeft counter. Used for adding callStipend.
         * @param amount - Amount to add
         */
        addStipend(amount: bigint): void;
        /**
         * Returns balance of the given account.
         * @param address - Address of account
         */
        getExternalBalance(address: Address_2): Promise<bigint>;
        /**
         * Store 256-bit a value in memory to persistent storage.
         */
        storageStore(key: Buffer, value: Buffer): Promise<void>;
        /**
         * Loads a 256-bit value to memory from persistent storage.
         * @param key - Storage key
         * @param original - If true, return the original storage value (default: false)
         */
        storageLoad(key: Buffer, original?: boolean): Promise<Buffer>;
        /**
         * Store 256-bit a value in memory to transient storage.
         * @param address Address to use
         * @param key Storage key
         * @param value Storage value
         */
        transientStorageStore(key: Buffer, value: Buffer): void;
        /**
         * Loads a 256-bit value to memory from transient storage.
         * @param address Address to use
         * @param key Storage key
         */
        transientStorageLoad(key: Buffer): Buffer;
        /**
         * Set the returning output data for the execution.
         * @param returnData - Output data to return
         */
        finish(returnData: Buffer): void;
        /**
         * Set the returning output data for the execution. This will halt the
         * execution immediately and set the execution result to "reverted".
         * @param returnData - Output data to return
         */
        revert(returnData: Buffer): void;
        /**
         * Returns address of currently executing account.
         */
        getAddress(): Address_2;
        /**
         * Returns balance of self.
         */
        getSelfBalance(): bigint;
        /**
         * Returns the deposited value by the instruction/transaction
         * responsible for this execution.
         */
        getCallValue(): bigint;
        /**
         * Returns input data in current environment. This pertains to the input
         * data passed with the message call instruction or transaction.
         */
        getCallData(): Buffer;
        /**
         * Returns size of input data in current environment. This pertains to the
         * input data passed with the message call instruction or transaction.
         */
        getCallDataSize(): bigint;
        /**
         * Returns caller address. This is the address of the account
         * that is directly responsible for this execution.
         */
        getCaller(): bigint;
        /**
         * Returns the size of code running in current environment.
         */
        getCodeSize(): bigint;
        /**
         * Returns the code running in current environment.
         */
        getCode(): Buffer;
        /**
         * Returns the current gasCounter.
         */
        getGasLeft(): bigint;
        /**
         * Returns size of current return data buffer. This contains the return data
         * from the last executed call, callCode, callDelegate, callStatic or create.
         * Note: create only fills the return data buffer in case of a failure.
         */
        getReturnDataSize(): bigint;
        /**
         * Returns the current return data buffer. This contains the return data
         * from last executed call, callCode, callDelegate, callStatic or create.
         * Note: create only fills the return data buffer in case of a failure.
         */
        getReturnData(): Buffer;
        /**
         * Returns true if the current call must be executed statically.
         */
        isStatic(): boolean;
        /**
         * Returns price of gas in current environment.
         */
        getTxGasPrice(): bigint;
        /**
         * Returns the execution's origination address. This is the
         * sender of original transaction; it is never an account with
         * non-empty associated code.
         */
        getTxOrigin(): bigint;
        /**
         * Returns the block’s number.
         */
        getBlockNumber(): bigint;
        /**
         * Returns the block's beneficiary address.
         */
        getBlockCoinbase(): bigint;
        /**
         * Returns the block's timestamp.
         */
        getBlockTimestamp(): bigint;
        /**
         * Returns the block's difficulty.
         */
        getBlockDifficulty(): bigint;
        /**
         * Returns the block's prevRandao field.
         */
        getBlockPrevRandao(): bigint;
        /**
         * Returns the block's gas limit.
         */
        getBlockGasLimit(): bigint;
        /**
         * Returns the Base Fee of the block as proposed in [EIP-3198](https;//eips.etheruem.org/EIPS/eip-3198)
         */
        getBlockBaseFee(): bigint;
        /**
         * Returns the chain ID for current chain. Introduced for the
         * CHAINID opcode proposed in [EIP-1344](https://eips.ethereum.org/EIPS/eip-1344).
         */
        getChainId(): bigint;
        /**
         * Sends a message with arbitrary data to a given address path.
         */
        call(gasLimit: bigint, address: Address_2, value: bigint, data: Buffer): Promise<bigint>;
        /**
         * Sends a message with arbitrary data to a given address path.
         */
        authcall(gasLimit: bigint, address: Address_2, value: bigint, data: Buffer): Promise<bigint>;
        /**
         * Message-call into this account with an alternative account's code.
         */
        callCode(gasLimit: bigint, address: Address_2, value: bigint, data: Buffer): Promise<bigint>;
        /**
         * Sends a message with arbitrary data to a given address path, but disallow
         * state modifications. This includes log, create, selfdestruct and call with
         * a non-zero value.
         */
        callStatic(gasLimit: bigint, address: Address_2, value: bigint, data: Buffer): Promise<bigint>;
        /**
         * Message-call into this account with an alternative account’s code, but
         * persisting the current values for sender and value.
         */
        callDelegate(gasLimit: bigint, address: Address_2, value: bigint, data: Buffer): Promise<bigint>;
        _baseCall(msg: Message): Promise<bigint>;
        /**
         * Creates a new contract with a given value.
         */
        create(gasLimit: bigint, value: bigint, data: Buffer, salt?: Buffer): Promise<bigint>;
        /**
         * Creates a new contract with a given value. Generates
         * a deterministic address via CREATE2 rules.
         */
        create2(gasLimit: bigint, value: bigint, data: Buffer, salt: Buffer): Promise<bigint>;
        /**
         * Mark account for later deletion and give the remaining balance to the
         * specified beneficiary address. This will cause a trap and the
         * execution will be aborted immediately.
         * @param toAddress - Beneficiary address
         */
        selfDestruct(toAddress: Address_2): Promise<void>;
        _selfDestruct(toAddress: Address_2): Promise<void>;
        /**
         * Creates a new log in the current environment.
         */
        log(data: Buffer, numberOfTopics: number, topics: Buffer[]): void;
        private _getReturnCode;
    }

    declare interface InterpreterOpts {
        pc?: number;
    }

    declare interface InterpreterResult {
        runState: RunState;
        exceptionError?: EvmError;
    }

    declare interface InterpreterStep {
        gasLeft: bigint;
        gasRefund: bigint;
        eei: EEIInterface;
        stack: bigint[];
        returnStack: bigint[];
        pc: number;
        depth: number;
        opcode: {
            name: string;
            fee: number;
            dynamicFee?: bigint;
            isAsync: boolean;
        };
        account: Account_2;
        address: Address_2;
        memory: Buffer;
        memoryWordCount: bigint;
        codeAddress: Address_2;
    }

    declare type IntersectionFromUnion<Union> = (Union extends unknown ? Consumer<Union> : never) extends Consumer<infer ResultIntersection> ? ResultIntersection : never;

    /**
     * Returned if the transaction is specified to use less gas than required to start the invocation.
     */
    declare const INTRINSIC_GAS_TOO_LOW = "intrinsic gas too low";

    /**
     * Returned if the transaction contains an invalid signature.
     */
    declare const INVALID_SENDER = "invalid sender";

    declare type IsNeverType<T> = [T] extends [never] ? true : never;

    declare interface ITraceData {
        toBuffer(): Buffer;
        toString(): string;
        toJSON(): string;
        isTraceData?: boolean;
    }

    declare type JsonAccessListItem = {
        address: string;
        storageKeys: string[];
    };

    /**
     * An object with the block's data represented as strings.
     */
    declare interface JsonBlock {
        /**
         * Header data for the block
         */
        header?: JsonHeader;
        transactions?: JsonTx[];
        uncleHeaders?: JsonHeader[];
    }

    /**
     * An object with the block header's data represented as strings.
     */
    declare interface JsonHeader {
        parentHash?: string;
        uncleHash?: string;
        coinbase?: string;
        stateRoot?: string;
        transactionsTrie?: string;
        receiptTrie?: string;
        logsBloom?: string;
        difficulty?: string;
        number?: string;
        gasLimit?: string;
        gasUsed?: string;
        timestamp?: string;
        extraData?: string;
        mixHash?: string;
        nonce?: string;
        baseFeePerGas?: string;
    }

    declare type JsonRpc = {
        readonly id: string;
        readonly jsonrpc: string;
        toString(): string;
    };

    declare interface JsonRpcBlock {
        number: string;
        hash: string;
        parentHash: string;
        mixHash?: string;
        nonce: string;
        sha3Uncles: string;
        logsBloom: string;
        transactionsRoot: string;
        stateRoot: string;
        receiptsRoot: string;
        miner: string;
        difficulty: string;
        totalDifficulty: string;
        extraData: string;
        size: string;
        gasLimit: string;
        gasUsed: string;
        timestamp: string;
        transactions: Array<JsonRpcTx | string>;
        uncles: string[];
        baseFeePerGas?: string;
    }

    declare type JsonRpcDataInputArg = string | Buffer;

    declare type JsonRpcError = JsonRpc & {
        readonly error: {
            readonly [key: string]: unknown;
            readonly code: number;
            readonly message: any;
        };
        readonly result?: any;
    };

    declare enum JsonRpcErrorCode {
        /**
         * Invalid JSON was received by the server.
         * An error occurred on the server while parsing the JSON text.
         */
        PARSE_ERROR = -32700,
        /**
         * The JSON sent is not a valid Request object.
         */
        INVALID_REQUEST = -32600,
        /**
         * The method does not exist / is not available.
         */
        METHOD_NOT_FOUND = -32601,
        /**
         * Invalid method parameter(s).
         */
        INVALID_PARAMS = -32602,
        /**
         * Internal JSON-RPC error.
         */
        INTERNAL_ERROR = -32603,
        /**
         * Missing or invalid parameters
         */
        INVALID_INPUT = -32000,
        /**
         * Transaction creation failed
         */
        TRANSACTION_REJECTED = -32003,
        /**
         * 	Method is not implemented
         */
        METHOD_NOT_SUPPORTED = -32004,
        /**
         * 	Request exceeds defined limit
         */
        LIMIT_EXCEEDED = -32005,
        /**
         * Version of JSON-RPC protocol is not supported
         */
        JSON_RPC_VERSION_NOT_SUPPORTED = -32006
    }

    declare type JsonRpcInputArg = number | bigint | string | Buffer;

    declare type JsonRpcRequest<Ledger extends Api, Method extends KnownKeys<Ledger>> = JsonRpc & {
        readonly id: string | number;
        readonly jsonrpc: string;
        readonly method: Method;
        readonly params?: OverloadedParameters<Ledger[Method]>;
    };

    declare type JsonRpcResponse = JsonRpc & {
        readonly result: any;
    };

    declare interface JsonRpcTx {
        blockHash: string | null;
        blockNumber: string | null;
        from: string;
        gas: string;
        gasPrice: string;
        maxFeePerGas?: string;
        maxPriorityFeePerGas?: string;
        type: string;
        accessList?: JsonTx['accessList'];
        chainId?: string;
        hash: string;
        input: string;
        nonce: string;
        to: string | null;
        transactionIndex: string | null;
        value: string;
        v: string;
        r: string;
        s: string;
    }

    /**
     * Generic interface for all tx types with a
     * JSON representation of a transaction.
     *
     * Note that all values are marked as optional
     * and not all the values are present on all tx types
     * (an EIP1559 tx e.g. lacks a `gasPrice`).
     */
    declare interface JsonTx {
        nonce?: string;
        gasPrice?: string;
        gasLimit?: string;
        to?: string;
        data?: string;
        v?: string;
        r?: string;
        s?: string;
        value?: string;
        chainId?: string;
        accessList?: JsonAccessListItem[];
        type?: string;
        maxPriorityFeePerGas?: string;
        maxFeePerGas?: string;
    }

    declare interface KeyInfoConfig {
        properties: {
            type: {
                type: KeyType;
                serializedType: KeyType;
                serializedName: "Type";
            };
            privateKey: {
                type: Buffer;
                serializedType: string;
                serializedName: "PrivateKey";
            };
        };
    }

    declare enum KeyType {
        KeyTypeBLS = "bls",
        KeyTypeSecp256k1 = "secp256k1",
        KeyTypeSecp256k1Ledger = "secp256k1-ledger"
    }

    declare type KnownKeys<T> = keyof RemoveIndex<T>;

    declare type KnownNetworks = "mainnet" | "goerli" | "görli" | "sepolia";

    declare class LeafNode extends Node {
        constructor(nibbles: Nibbles, value: Buffer);
        static encodeKey(key: Nibbles): Nibbles;
    }

    declare type Legacy<C extends Base.Config, N extends OptionName<C>> = Option<C, N>["legacy"];

    declare type LegacyDatabasePayload = [
    nonce: Buffer,
    gasPrice: Buffer,
    gas: Buffer,
    to: Buffer,
    value: Buffer,
    data: Buffer,
    v: Buffer,
    r: Buffer,
    s: Buffer
    ];

    declare type LegacyOptions<C extends Base.Config> = {
        [K in OptionName<C>]: Option<C, K> extends {
            legacy: any;
        } ? K : never;
    }[OptionName<C>];

    declare type LegacyRpcTransaction = Readonly<RpcTransaction> & {
        readonly gasPrice?: string;
        readonly chainId?: never;
        readonly accessList?: never;
        readonly maxPriorityFeePerGas?: never;
        readonly maxFeePerGas?: never;
    };

    declare class LegacyTransaction extends RuntimeTransaction {
        gasPrice: Quantity;
        type: Quantity;
        constructor(data: LegacyDatabasePayload | Transaction, common: Common, extra?: GanacheRawExtraTx);
        maxGasPrice(): Quantity;
        toJSON(common?: Common): LegacyTransactionJSON;
        static fromTxData(data: LegacyDatabasePayload | Transaction, common: Common, extra?: GanacheRawExtraTx): LegacyTransaction;
        static fromEIP2930AccessListTransaction(data: EIP2930AccessListDatabasePayload | Transaction, common: Common): LegacyTransaction;
        toVmTransaction(): {
            hash: () => Buffer;
            nonce: bigint;
            gasPrice: bigint;
            gasLimit: bigint;
            to: Address;
            value: bigint;
            data: Buffer;
            getSenderAddress: () => Address;
            /**
             * the minimum amount of gas the tx must have (DataFee + TxFee + Creation Fee)
             */
            getBaseFee: () => bigint;
            getUpfrontCost: () => bigint;
            supports: (capability: Capability) => boolean;
        };
        /**
         * sign a transaction with a given private key, then compute and set the `hash`.
         *
         * @param privateKey - Must be 32 bytes in length
         */
        signAndHash(privateKey: Buffer): void;
        toEthRawTransaction(v: Buffer, r: Buffer, s: Buffer): LegacyDatabasePayload;
        computeIntrinsics(v: Quantity, raw: TypedDatabaseTransaction, chainId: bigint): {
            from: Address;
            hash: Data;
            serialized: Buffer;
            encodedData: EncodedPart;
            encodedSignature: EncodedPart;
        };
        updateEffectiveGasPrice(): void;
    }

    declare type LegacyTransactionJSON = {
        hash: Data;
        type?: Quantity;
        nonce: Quantity;
        blockHash: Data;
        blockNumber: Quantity;
        transactionIndex: Quantity;
        from: Address;
        to: Address;
        value: Quantity;
        gas: Quantity;
        gasPrice: Quantity;
        input: Data;
        v: Quantity;
        r: Quantity;
        s: Quantity;
    };

    declare interface LevelUp<DB = AbstractLevelDOWN, Iterator = AbstractIterator<any, any>> extends EventEmitter {
        open(): Promise<void>;
        open(callback?: ErrorCallback): void;
        close(): Promise<void>;
        close(callback?: ErrorCallback): void;

        put: InferDBPut<DB>;
        get: InferDBGet<DB>;
        del: InferDBDel<DB>;
        clear: InferDBClear<DB>;
        getMany: InferDBGetMany<DB>;

        batch(array: AbstractBatch[], options?: any): Promise<void>;
        batch(array: AbstractBatch[], options: any, callback: (err?: any) => any): void;
        batch(array: AbstractBatch[], callback: (err?: any) => any): void;

        batch(): LevelUpChain;
        iterator(options?: AbstractIteratorOptions): Iterator;

        isOpen(): boolean;
        isClosed(): boolean;

        readonly status: "new" | "opening" | "open" | "closing" | "closed";
        isOperational(): boolean;

        createReadStream(options?: AbstractIteratorOptions): NodeJS.ReadableStream;
        createKeyStream(options?: AbstractIteratorOptions): NodeJS.ReadableStream;
        createValueStream(options?: AbstractIteratorOptions): NodeJS.ReadableStream;

        /*
        emitted when a new value is 'put'
        */
        on(event: 'put', cb: (key: any, value: any) => void): this;
        /*
        emitted when a value is deleted
        */
        on(event: 'del', cb: (key: any) => void): this;
        /*
        emitted when a batch operation has executed
        */
        on(event: 'batch', cb: (ary: any[]) => void): this;
        /*
        emitted when clear is called
        */
        on(event: 'clear', cb: (opts: any) => void): this;
        /*
        emitted on given event
        */
        on(event: 'open' | 'ready' | 'closed' | 'opening' | 'closing', cb: () => void): this;
    }

    declare const LevelUp: LevelUpConstructor;

    declare interface LevelUpChain<K = any, V = any> {
        readonly length: number;
        put(key: K, value: V): this;
        del(key: K): this;
        clear(): this;
        write(callback: ErrorCallback): this;
        write(): Promise<this>;
    }

    declare type LevelUpClear<O> =
    ((callback: ErrorCallback) => void) &
    ((options: O, callback: ErrorCallback) => void) &
    ((options?: O) => Promise<void>);

    declare interface LevelUpConstructor {
        <DB extends AbstractLevelDOWN = AbstractLevelDOWN>(
        db: DB,
        options: any,
        cb?: ErrorCallback): LevelUp<DB>;

        <DB extends AbstractLevelDOWN = AbstractLevelDOWN>(
        db: DB,
        cb?: ErrorCallback): LevelUp<DB>;

        new <DB extends AbstractLevelDOWN = AbstractLevelDOWN>(
        db: DB,
        options: any,
        cb?: ErrorCallback): LevelUp<DB>;

        new <DB extends AbstractLevelDOWN = AbstractLevelDOWN>(
        db: DB,
        cb?: ErrorCallback): LevelUp<DB>;

        errors: {
            LevelUPError: typeof LevelUPError;
            InitializationError: typeof InitializationError;
            OpenError: typeof OpenError;
            ReadError: typeof ReadError;
            WriteError: typeof WriteError;
            NotFoundError: typeof NotFoundError;
            EncodingError: typeof EncodingError;
        };
    }

    declare type LevelUpDel<K, O> =
    ((key: K, callback: ErrorCallback) => void) &
    ((key: K, options: O, callback: ErrorCallback) => void) &
    ((key: K, options?: O) => Promise<void>);

    declare class LevelUPError extends Error {}

    declare type LevelUpGet<K, V, O> =
    ((key: K, callback: ErrorValueCallback<V>) => void) &
    ((key: K, options: O, callback: ErrorValueCallback<V>) => void) &
    ((key: K, options?: O) => Promise<V>);

    declare type LevelUpGetMany<K, V, O> =
    ((keys: K[], callback: ErrorValueCallback<V[]>) => void) &
    ((keys: K[], options: O, callback: ErrorValueCallback<V[]>) => void) &
    ((keys: K[], options?: O) => Promise<V[]>);

    declare type LevelUpPut<K, V, O> =
    ((key: K, value: V, callback: ErrorCallback) => void) &
    ((key: K, value: V, options: O, callback: ErrorCallback) => void) &
    ((key: K, value: V, options?: O) => Promise<void>);

    declare type Literal<C extends BaseConfig_2> = C["type"];

    declare type LiteralDefinition<C extends BaseConfig_2> = {
        defaultValue?: DefaultValue_2<SerializedLiteral<C>, Literal<C>>;
    };

    declare class Lock {
        private permits;
        private promiseResolverQueue;
        /**
         * Returns a promise used to wait for a permit to become available. This method should be awaited on.
         * @returns  A promise that gets resolved when execution is allowed to proceed.
         */
        acquire(): Promise<boolean>;
        /**
         * Increases the number of permits by one. If there are other functions waiting, one of them will
         * continue to execute in a future iteration of the event loop.
         */
        release(): void;
    }

    /**
     * Log that the contract emits.
     */
    declare type Log = [address: Buffer, topics: Buffer[], data: Buffer];

    declare type Log_2 = {
        address: Address;
        blockHash: Data;
        blockNumber: Quantity;
        data: Data | Data[];
        logIndex: Quantity;
        removed: boolean;
        topics: Data | Data[];
        transactionHash: Data;
        transactionIndex: Quantity;
    };

    declare type Logger = {
        log(message?: any, ...optionalParams: any[]): void;
    };

    declare type LoggingConfig = {
        options: {
            /**
             * Set to `true` to log EVM opcodes.
             *
             * @defaultValue false
             */
            readonly debug: {
                type: boolean;
                hasDefault: true;
                legacy: {
                    /**
                     * @deprecated Use logging.debug instead
                     */
                    debug: boolean;
                };
            };
            /**
             * An object, like `console`, that implements a `log` function.
             *
             * Defaults to `console` (logs to stdout).
             *
             * @example
             * ```typescript
             * {
             * 	log: (message: any) => {
             * 		// handle `message`
             * 	}
             * }
             * ```
             */
            readonly logger: {
                type: Logger;
                hasDefault: true;
                legacy: {
                    /**
                     * @deprecated Use logging.logger instead
                     */
                    logger: Logger;
                };
            };
            /**
             * Set to `true` to log detailed RPC requests.
             *
             * @defaultValue false
             */
            readonly verbose: {
                type: boolean;
                hasDefault: true;
                legacy: {
                    /**
                     * @deprecated Use logging.verbose instead
                     */
                    verbose: boolean;
                };
            };
            /**
             * Set to `true` to disable logging. This option overrides
             * logging.logger and option.verbose.
             *
             * @defaultValue false
             */
            readonly quiet: {
                type: boolean;
                hasDefault: true;
            };
        };
    };

    declare type LoggingConfig_2 = {
        options: {
            /**
             * An object, like `console`, that implements a `log` function.
             *
             * Defaults to `console` (logs to stdout).
             *
             * @example
             * ```typescript
             * {
             * 	log: (message: any) => {
             * 		// handle `message`
             * 	}
             * }
             * ```
             */
            readonly logger: {
                type: {
                    log(message?: any, ...optionalParams: any[]): void;
                };
                hasDefault: true;
            };
        };
    };

    declare const _logs: unique symbol;

    declare type MakeLegacyOptions<C extends Base.Config> = UnionToIntersection<{
        [K in OptionName<C>]: K extends LegacyOptions<C> ? Legacy<C, K> : Record<K, OptionRawType<C, K>>;
    }[OptionName<C>]>;

    declare type MakeLegacyOptions_2<C extends Base.Config> = UnionToIntersection_3<{
        [K in OptionName<C>]: K extends LegacyOptions<C> ? Legacy<C, K> : Record<K, OptionRawType<C, K>>;
    }[OptionName<C>]>;

    declare class Manager<T> {
        #private;
        protected base: GanacheLevelUp;
        constructor(base: GanacheLevelUp, type: Instantiable<T>, options?: ConstructorParameters<Instantiable<T>>[1]);
        getRaw(key: string | Buffer): Promise<Buffer>;
        get(key: string | Buffer): Promise<T>;
        set(key: Buffer, value: Buffer): Promise<void>;
        del(key: Buffer): Promise<void>;
    }

    declare class Manager_2<T extends SerializableObject<C>, C extends BaseConfig> {
        #private;
        protected base: LevelUp;
        constructor(base: LevelUp, type: Instantiable_2<T>, options?: ConstructorParameters<Instantiable_2<T>>[1]);
        getRaw(key: number | string | Buffer): Promise<Buffer | null>;
        get(key: number | string | Buffer): Promise<T | null>;
        setRaw(key: number | string | Buffer, value: Buffer): Promise<void>;
        set(key: number | string | Buffer, value: T): Promise<void>;
        del(key: Buffer): Promise<void>;
    }

    declare type MaybeEncrypted = {
        encrypted: true;
        key: EncryptType;
    } | {
        encrypted: false;
        key: Buffer;
    };

    /**
     * Memory implements a simple memory model
     * for the ethereum virtual machine.
     */
    declare class Memory {
        _store: Buffer;
        constructor();
        /**
         * Extends the memory given an offset and size. Rounds extended
         * memory to word-size.
         */
        extend(offset: number, size: number): void;
        /**
         * Writes a byte array with length `size` to memory, starting from `offset`.
         * @param offset - Starting position
         * @param size - How many bytes to write
         * @param value - Value
         */
        write(offset: number, size: number, value: Buffer): void;
        /**
         * Reads a slice of memory from `offset` till `offset + size` as a `Buffer`.
         * It fills up the difference between memory's length and `offset + size` with zeros.
         * @param offset - Starting position
         * @param size - How many bytes to read
         */
        read(offset: number, size: number): Buffer;
    }

    declare class Message {
        to?: Address_2;
        value: bigint;
        caller: Address_2;
        gasLimit: bigint;
        data: Buffer;
        depth: number;
        code?: Buffer | PrecompileFunc;
        _codeAddress?: Address_2;
        isStatic: boolean;
        isCompiled: boolean;
        salt?: Buffer;
        containerCode?: Buffer; /** container code for EOF1 contracts - used by CODECOPY/CODESIZE */
        /**
         * Map of addresses to selfdestruct. Key is the unprefixed address.
         * Value is a boolean when marked for destruction and replaced with a Buffer containing the address where the remaining funds are sent.
         */
        selfdestruct?: {
            [key: string]: boolean;
        } | {
            [key: string]: Buffer;
        };
        delegatecall: boolean;
        /**
         * This is used to store the origin of the AUTHCALL,
         * the purpose is to figure out where `value` should be taken from (not from `caller`)
         */
        authcallOrigin?: Address_2;
        gasRefund: bigint;
        constructor(opts: MessageOpts);
        /**
         * Note: should only be called in instances where `_codeAddress` or `to` is defined.
         */
        get codeAddress(): Address_2;
    }

    declare class Message_2 extends SerializableObject<MessageConfig> implements DeserializedObject<MessageConfig> {
        get config(): Definitions<MessageConfig>;
        constructor(options?: Partial<SerializedObject<MessageConfig>> | Partial<DeserializedObject<MessageConfig>>);
        version: number;
        to: string;
        from: string;
        nonce: number;
        value: bigint;
        gasLimit: number;
        gasFeeCap: bigint;
        gasPremium: bigint;
        method: number;
        params: Buffer;
    }

    declare type MessageConfig = {
        properties: {
            version: {
                type: number;
                serializedType: number;
                serializedName: "Version";
            };
            to: {
                type: string;
                serializedType: string;
                serializedName: "To";
            };
            from: {
                type: string;
                serializedType: string;
                serializedName: "From";
            };
            nonce: {
                type: number;
                serializedType: number;
                serializedName: "Nonce";
            };
            value: {
                type: bigint;
                serializedType: string;
                serializedName: "Value";
            };
            gasLimit: {
                type: number;
                serializedType: number;
                serializedName: "GasLimit";
            };
            gasFeeCap: {
                type: bigint;
                serializedType: string;
                serializedName: "GasFeeCap";
            };
            gasPremium: {
                type: bigint;
                serializedType: string;
                serializedName: "GasPremium";
            };
            method: {
                type: number;
                serializedType: number;
                serializedName: "Method";
            };
            params: {
                type: Buffer;
                serializedType: string;
                serializedName: "Params";
            };
        };
    };

    declare type MessageEvent = {
        readonly type: "eth_subscription";
        readonly data: {
            readonly subscription: string;
            readonly result: unknown;
        };
    };

    declare interface MessageOpts {
        to?: Address_2;
        value?: bigint;
        caller?: Address_2;
        gasLimit: bigint;
        data?: Buffer;
        depth?: number;
        code?: Buffer | PrecompileFunc;
        codeAddress?: Address_2;
        isStatic?: boolean;
        isCompiled?: boolean;
        salt?: Buffer;
        /**
         * A map of addresses to selfdestruct, see {@link Message.selfdestruct}
         */
        selfdestruct?: {
            [key: string]: boolean;
        } | {
            [key: string]: Buffer;
        };
        delegatecall?: boolean;
        authcallOrigin?: Address_2;
        gasRefund?: bigint;
    }

    declare class MessageSendSpec extends SerializableObject<MessageSendSpecConfig> implements DeserializedObject<MessageSendSpecConfig> {
        get config(): Definitions<MessageSendSpecConfig>;
        constructor(options?: Partial<SerializedObject<MessageSendSpecConfig>> | Partial<DeserializedObject<MessageSendSpecConfig>>);
        maxFee: bigint;
    }

    declare type MessageSendSpecConfig = {
        properties: {
            maxFee: {
                type: bigint;
                serializedType: string;
                serializedName: "MaxFee";
            };
        };
    };

    declare interface MessageTypeProperty {
        name: string;
        type: string;
    }

    declare interface MessageTypes {
        EIP712Domain: MessageTypeProperty[];
        [additionalProperties: string]: MessageTypeProperty[];
    }

    declare type MessageWithTo = Message & Pick<Required<MessageOpts>, 'to'>;

    declare type MinerConfig = {
        options: {
            /**
             * Sets the `blockTime` in seconds for automatic mining. A blockTime of `0`
             * (default) enables "instamine mode", where new executable transactions
             * will be mined instantly.
             *
             * Using the `blockTime` option is discouraged unless you have tests which
             * require a specific mining interval.
             *
             * @defaultValue 0 // "instamine mode"
             */
            blockTime: {
                type: number;
                hasDefault: true;
                legacy: {
                    /**
                     * @deprecated Use miner.blockTime instead
                     */
                    blockTime: number;
                };
            };
            /**
             * The amount of time, in seconds, to add to the `timestamp` of each new
             * block header.
             *
             * By default the value is `"clock"`, which uses your system clock time as
             * the timestamp for each block.
             *
             * @defaultValue "clock"
             */
            timestampIncrement: {
                type: "clock" | Quantity;
                rawType: "clock" | string | number | bigint;
                hasDefault: true;
                cliType: string;
            };
            /**
             * Sets the default gas price in WEI for transactions if not otherwise specified.
             *
             * @defaultValue 2_000_000
             */
            defaultGasPrice: {
                type: Quantity;
                rawType: string | number | bigint;
                hasDefault: true;
                legacy: {
                    /**
                     * @deprecated Use miner.gasPrice instead
                     */
                    gasPrice: string | number | bigint;
                };
                cliType: string;
            };
            /**
             * Sets the block difficulty; value is always 0 after the merge hardfork
             *
             * @defaultValue 1
             */
            difficulty: {
                type: Quantity;
                rawType: string | number | bigint;
                hasDefault: true;
                cliType: string;
            };
            /**
             * Sets the block gas limit in WEI.
             *
             * @defaultValue 30_000_000
             */
            blockGasLimit: {
                type: Quantity;
                rawType: string | number | bigint;
                hasDefault: true;
                legacy: {
                    /**
                     * @deprecated Use miner.blockGasLimit instead
                     */
                    gasLimit: string | number | bigint;
                };
                cliType: string;
            };
            /**
             * Sets the default transaction gas limit in WEI. Set to `"estimate"` to
             * use an estimate (slows down transaction execution by 40%+).
             *
             * @defaultValue 90_000
             */
            defaultTransactionGasLimit: {
                type: Quantity;
                rawType: "estimate" | string | number | bigint;
                hasDefault: true;
                cliType: string;
            };
            /**
             * Sets the transaction gas limit in WEI for `eth_call` and
             * `eth_estimateGas` calls.
             *
             * @defaultValue 50_000_000
             */
            callGasLimit: {
                type: Quantity;
                rawType: string | number | bigint;
                hasDefault: true;
                legacy: {
                    /**
                     * @deprecated Use miner.callGasLimit instead
                     */
                    callGasLimit: string | number | bigint;
                };
                cliType: string;
            };
            /**
             * Set the instamine mode to either "eager" (default) or "strict".
             *  * In "eager" mode a transaction will be included in a block before
             * its hash is returned to the caller.
             *  * In "strict" mode a transaction's hash is returned to the caller before
             * the transaction is included in a block.
             * `instamine` has no effect if `blockTime` is *not* `0` (the default).
             *
             * @defaultValue "eager"
             */
            instamine: {
                type: "eager" | "strict";
                hasDefault: true;
                legacy: {
                    instamine: "eager" | "strict";
                };
            };
            /**
             * Sets the address where mining rewards will go.
             *
             * * `{string}` hex-encoded address
             * * `{number}` index of the account returned by `eth_getAccounts`
             *
             * @defaultValue "0x0000000000000000000000000000000000000000"
             */
            coinbase: {
                rawType: string | number;
                type: Address | number;
                hasDefault: true;
                cliType: string;
            };
            /**
             * Set the extraData block header field a miner can include.
             *
             * @defaultValue ""
             */
            extraData: {
                rawType: string;
                type: Data;
                hasDefault: true;
            };
            /**
             * Minimum price bump percentage needed to replace a transaction that already exists in the transaction pool.
             *
             * @defaultValue ""
             */
            priceBump: {
                type: bigint;
                rawType: string | number | bigint;
                hasDefault: true;
                cliType: string;
            };
        };
    };

    declare type MinerConfig_2 = {
        options: {
            /**
             * Sets the `blockTime` in seconds for automatic mining. A `blockTime` of `0`
             * (default) or a negative number enables "instamine mode", where new executable transactions
             * will be mined instantly.
             *
             * Using the `blockTime` option is discouraged unless you have tests which
             * require a specific mining interval.
             *
             * @defaultValue 0 // "instamine mode"
             */
            blockTime: {
                type: number;
                hasDefault: true;
            };
            /**
             * Enable mining. Set to `false` to pause the miner. If set to `false`,
             * calling `Ganache.MineTipset` method will still mine a tipset/block.
             *
             * Call `Ganache.EnableMiner` or `Ganache.DisableMiner` to enable/disable
             * during runtime.
             *
             * @defaultValue true
             */
            mine: {
                type: boolean;
                hasDefault: true;
            };
        };
    };

    declare type MinerInfoConfig = {
        properties: {
            owner: {
                type: Address_3;
                serializedType: SerializedAddress;
                serializedName: "Owner";
            };
            worker: {
                type: Address_3;
                serializedType: SerializedAddress;
                serializedName: "Worker";
            };
            newWorker: {
                type: Address_3;
                serializedType: SerializedAddress;
                serializedName: "NewWorker";
            };
            controlAddresses: {
                type: string[];
                serializedType: string[];
                serializedName: "ControlAddresses";
            };
            workerChangeEpoch: {
                type: number;
                serializedType: number;
                serializedName: "WorkerChangeEpoch";
            };
            peerId: {
                type: string;
                serializedType: string;
                serializedName: "PeerId";
            };
            multiaddrs: {
                type: Uint8Array[];
                serializedType: Uint8Array[];
                serializedName: "Multiaddrs";
            };
            sealProofType: {
                type: number;
                serializedType: number;
                serializedName: "SealProofType";
            };
            sectorSize: {
                type: number;
                serializedType: number;
                serializedName: "SectorSize";
            };
            windowPoStPartitionSectors: {
                type: number;
                serializedType: number;
                serializedName: "WindowPoStPartitionSectors";
            };
            consensusFaultElapsed: {
                type: number;
                serializedType: number;
                serializedName: "ConsensusFaultElapsed";
            };
        };
    };

    declare type MinerPowerConfig = {
        properties: {
            minerPower: {
                type: PowerClaim;
                serializedType: SerializedPowerClaim;
                serializedName: "MinerPower";
            };
            totalPower: {
                type: PowerClaim;
                serializedType: SerializedPowerClaim;
                serializedName: "TotalPower";
            };
            hasMinPower: {
                type: boolean;
                serializedType: SerializedRootCID;
                serializedName: "HasMinPower";
            };
        };
    };

    declare interface MsgParams<D> {
        data: D;
        sig?: string;
    }

    declare interface NewContractEvent {
        address: Address_2;
        code: Buffer;
    }

    declare type Nibbles = number[];

    declare class Node {
        _nibbles: Nibbles;
        _value: Buffer;
        _terminator: boolean;
        constructor(nibbles: Nibbles, value: Buffer, terminator: boolean);
        static decodeKey(key: Nibbles): Nibbles;
        key(k?: Nibbles): Nibbles;
        keyLength(): number;
        value(v?: Buffer): Buffer;
        encodedKey(): Nibbles;
        raw(): [Buffer, Buffer];
        serialize(): Buffer;
    }

    /**
     * Returned if the nonce of a transaction is lower than the one present in the local chain.
     */
    declare const NONCE_TOO_LOW = "nonce too low";

    declare class NoOp {
    }

    declare function normalize(input: number | string): string;

    declare function normalizeEvent(event: InterpreterStep): {
        account: {
            nonce: bigint;
            balance: bigint;
            stateRoot: Buffer;
            codeHash: Buffer;
        };
        address: Buffer;
        codeAddress: Buffer;
        depth: bigint;
        gasLeft: bigint;
        gasRefund: bigint;
        memory: Buffer;
        memoryWordCount: bigint;
        opcode: {
            name: string;
            fee: number;
        };
        pc: bigint;
        returnStack: bigint[];
        stack: bigint[];
    };

    declare class NotFoundError extends LevelUPError {
        readonly notFound: true;
        readonly status: 404;
    }

    declare type NoUnknownArray<T> = T extends infer I ? unknown[] extends I ? never : I : T;

    declare type OnBlock = (block: Block_3, reorg: boolean) => Promise<void> | void;

    declare type oneThroughSeven = "1" | "2" | "3" | "4" | "5" | "6" | "7";

    declare class Opcode {
        readonly code: number;
        readonly name: string;
        readonly fullName: string;
        readonly fee: number;
        readonly isAsync: boolean;
        readonly dynamicGas: boolean;
        constructor({ code, name, fullName, fee, isAsync, dynamicGas, }: {
            code: number;
            name: string;
            fullName: string;
            fee: number;
            isAsync: boolean;
            dynamicGas: boolean;
        });
    }

    declare type OpcodeList = Map<number, Opcode>;

    declare class OpenError extends LevelUPError {}

    declare type OpHandler = SyncOpHandler | AsyncOpHandler;

    declare type Option<C extends Base.Config, N extends OptionName<C> = OptionName<C>> = Options<C>[N];

    declare type OptionName<C extends Base.Config> = keyof Options<C> & string;

    declare type OptionRawType<C extends Base.Config, N extends OptionName<C> = OptionName<C>> = void extends Option<C, N>["rawType"] ? Option<C, N>["type"] : Option<C, N>["rawType"];

    declare type Options<C extends Base.Config> = C["options"];

    declare type Options_2 = {
        server: ServerConfig;
    };

    declare type OptionsAccount = {
        balance: string | number | bigint | Buffer;
        secretKey?: string;
    };

    declare type OptionType<C extends Base.Config, N extends OptionName<C> = OptionName<C>> = Option<C, N>["type"];

    declare type OverloadedConsumerFromUnion<Union> = IntersectionFromUnion<Union extends unknown ? Consumer<Union> : never>;

    declare type OverloadedParameters<T extends (...args: any[]) => any> = NoUnknownArray<Parameters<Overloads<T>>>;

    declare type Overloads<T extends (...args: any[]) => any> = T extends {
        (...args: infer A1): infer R1;
        (...args: infer A2): infer R2;
        (...args: infer A3): infer R3;
        (...args: infer A4): infer R4;
        (...args: infer A5): infer R5;
        (...args: infer A6): infer R6;
    } ? ((...args: A1) => R1) | ((...args: A2) => R2) | ((...args: A3) => R3) | ((...args: A4) => R4) | ((...args: A5) => R5) | ((...args: A6) => R6) : T extends {
        (...args: infer A1): infer R1;
        (...args: infer A2): infer R2;
        (...args: infer A3): infer R3;
        (...args: infer A4): infer R4;
        (...args: infer A5): infer R5;
    } ? ((...args: A1) => R1) | ((...args: A2) => R2) | ((...args: A3) => R3) | ((...args: A4) => R4) | ((...args: A5) => R5) : T extends {
        (...args: infer A1): infer R1;
        (...args: infer A2): infer R2;
        (...args: infer A3): infer R3;
        (...args: infer A4): infer R4;
    } ? ((...args: A1) => R1) | ((...args: A2) => R2) | ((...args: A3) => R3) | ((...args: A4) => R4) : T extends {
        (...args: infer A1): infer R1;
        (...args: infer A2): infer R2;
        (...args: infer A3): infer R3;
    } ? ((...args: A1) => R1) | ((...args: A2) => R2) | ((...args: A3) => R3) : T extends {
        (...args: infer A1): infer R1;
        (...args: infer A2): infer R2;
    } ? ((...args: A1) => R1) | ((...args: A2) => R2) : T extends {
        (...args: infer A1): infer R1;
    } ? (...args: A1) => R1 : never;

    declare type PairsToMapping<T extends unknown[]> = T extends [] ? {} : T extends [[infer N, infer O], ...infer R] ? {
        [N_ in string & N]: O;
    } & PairsToMapping<R> : never;

    declare const Params: {
        /**
         *  Per transaction not creating a contract. NOTE: Not payable on data of calls between transactions.
         */
        TRANSACTION_GAS: bigint;
        /**
         * Per byte of data attached to a transaction that is not equal to zero. NOTE: Not payable on data of calls between transactions.
         * Ganache supports eth_call and debuging old transactions that should be run
         * in the context of their original hardfork, so hardforks we don't support
         * are listed here.
         */
        TRANSACTION_DATA_NON_ZERO_GAS: Map<"chainstart" | "homestead" | "dao" | "tangerineWhistle" | "spuriousDragon" | "byzantium" | "constantinople" | "petersburg" | "istanbul" | "muirGlacier" | "berlin" | "london" | "arrowGlacier" | "grayGlacier" | "merge", bigint>;
        /**
         * Per byte of data attached to a transaction that equals zero. NOTE: Not payable on data of calls between transactions.
         */
        TRANSACTION_DATA_ZERO_GAS: bigint;
        /**
         * Fee for creation a transaction
         */
        TRANSACTION_CREATION: bigint;
        /**
         * Gas cost per address in an EIP-2930 Access List transaction
         */
        ACCESS_LIST_ADDRESS_GAS: number;
        /**
         * Gas cost per storage key in an EIP-2930 Access List transaction
         */
        ACCESS_LIST_STORAGE_KEY_GAS: number;
    };

    declare interface Path {
        node: TrieNode | null;
        remaining: Nibbles;
        stack: TrieNode[];
    }

    declare function personalSign<T extends MessageTypes>(privateKey: Buffer, msgParams: MsgParams<TypedData | TypedMessage<T>>): string;

    /**
     * Receipt type for Byzantium and beyond replacing the intermediary
     * state root field with a status code field (EIP-658)
     */
    declare interface PostByzantiumTxReceipt extends BaseTxReceipt {
        /**
         * Status of transaction, `1` if successful, `0` if an exception occured
         */
        status: 0 | 1;
    }

    declare class PoStProof extends SerializableObject<PoStProofConfig> implements DeserializedObject<PoStProofConfig> {
        get config(): Definitions<PoStProofConfig>;
        constructor(options?: Partial<SerializedObject<PoStProofConfig>> | Partial<DeserializedObject<PoStProofConfig>>);
        postProof: number;
        proofBytes: Buffer;
    }

    declare interface PoStProofConfig {
        properties: {
            postProof: {
                type: number;
                serializedType: number;
                serializedName: "PoStProof";
            };
            proofBytes: {
                type: Buffer;
                serializedType: string;
                serializedName: "ProofBytes";
            };
        };
    }

    declare class PowerClaim extends SerializableObject<PowerClaimConfig> implements DeserializedObject<PowerClaimConfig> {
        get config(): Definitions<PowerClaimConfig>;
        constructor(options?: Partial<SerializedObject<PowerClaimConfig>> | Partial<DeserializedObject<PowerClaimConfig>>);
        rawBytePower: bigint;
        qualityAdjPower: bigint;
    }

    declare type PowerClaimConfig = {
        properties: {
            rawBytePower: {
                type: bigint;
                serializedType: string;
                serializedName: "RawBytePower";
            };
            qualityAdjPower: {
                type: bigint;
                serializedType: string;
                serializedName: "QualityAdjPower";
            };
        };
    };

    /**
     * Pre-Byzantium receipt type with a field
     * for the intermediary state root
     */
    declare interface PreByzantiumTxReceipt extends BaseTxReceipt {
        /**
         * Intermediary state root
         */
        stateRoot: Buffer;
    }

    declare interface PrecompileFunc {
        (input: PrecompileInput): Promise<ExecResult> | ExecResult;
    }

    declare interface PrecompileInput {
        data: Buffer;
        gasLimit: bigint;
        _common: Common;
        _EVM: EVMInterface;
    }

    declare type PrefixedHexString = string;

    declare type PrimitiveCliTypes = string | number | boolean;

    declare type Primitives = string | number | null | undefined | symbol | bigint;

    declare class PrioritizedTaskExecutor {
        /** The maximum size of the pool */
        private maxPoolSize;
        /** The current size of the pool */
        private currentPoolSize;
        /** The task queue */
        private queue;
        /**
         * Executes tasks up to maxPoolSize at a time, other items are put in a priority queue.
         * @class PrioritizedTaskExecutor
         * @private
         * @param maxPoolSize The maximum size of the pool
         */
        constructor(maxPoolSize: number);
        /**
         * Executes the task or queues it if no spots are available.
         * When a task is added, check if there are spots left in the pool.
         * If a spot is available, claim that spot and give back the spot once the asynchronous task has been resolved.
         * When no spots are available, add the task to the task queue. The task will be executed at some point when another task has been resolved.
         * @private
         * @param priority The priority of the task
         * @param fn The function that accepts the callback, which must be called upon the task completion.
         */
        executeOrQueue(priority: number, fn: Function): void;
        /**
         * Checks if the taskExecutor is finished.
         * @private
         * @returns Returns `true` if the taskExecutor is finished, otherwise returns `false`.
         */
        finished(): boolean;
    }

    declare class PrivateKeyManager {
        #private;
        static AccountsWithPrivateKeysKey: Buffer;
        private base;
        get addressesWithPrivateKeys(): string[];
        static initialize(base: LevelUp): Promise<PrivateKeyManager>;
        constructor(base: LevelUp, addressesWithPrivateKeys: string[]);
        getPrivateKey(address: string): Promise<string | null>;
        /**
         * NOTE: This function should only be called from
         * `AccountManager.putAccount` to ensure fields are written
         * atomically. Only call this function if you know what you're doing.
         */
        putPrivateKey(address: string, privateKey: string): void;
        hasPrivateKey(address: string): Promise<boolean>;
        deletePrivateKey(address: string): Promise<void>;
        setDefault(address: string): Promise<void>;
    }

    declare class PromiEvent<T> extends Promise<T> {
        constructor(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void);
        /**
         * Attaches a callback for only the rejection of the Promise.
         * @param onrejected - The callback to execute when the Promise is rejected.
         * @returns A PromiEvent for the completion of the callback.
         */
        catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): PromiEvent<T | TResult>;
        /**
         * Creates a new resolved promievent.
         * @returns A resolved promievent.
         */
        static resolve(): PromiEvent<void>;
        /**
         * Creates a new resolved promievent for the provided value.
         * @param value - A promise.
         * @returns A promievent whose internal state matches the provided promise.
         */
        static resolve<T = never>(value: T | PromiseLike<T>): PromiEvent<T>;
        /**
         * Used to immediately clear all event listeners on the instance and prevent
         * any additional binding or emission from the Emitter.
         *
         * Once disposed no listeners can be bound to this emitter.
         *
         * Note: `dispose` is pre-bound to the `this`, making it possible to pass the
         * method around detached from it's context.
         */
        dispose: () => void;
    }

    declare interface PromiEvent<T> extends Promise<T>, Pick<Emittery, typeof emitteryMethods[number]> {
        emittery: Emittery;
    }

    declare type Proof = {
        address: PrefixedHexString;
        balance: PrefixedHexString;
        codeHash: PrefixedHexString;
        nonce: PrefixedHexString;
        storageHash: PrefixedHexString;
        accountProof: PrefixedHexString[];
        storageProof: StorageProof[];
    };

    declare type Proof_2 = {
        address: PrefixedHexString;
        balance: PrefixedHexString;
        codeHash: PrefixedHexString;
        nonce: PrefixedHexString;
        storageHash: PrefixedHexString;
        accountProof: PrefixedHexString[];
        storageProof: StorageProof_3[];
    };

    declare type Proof_3 = Buffer[];

    declare type PropertyName<C extends BaseConfig> = string & keyof C["properties"];

    declare type PropertyType<C extends BaseConfig, N extends PropertyName<C> = PropertyName<C>> = C["properties"][N]["type"];

    /**
     * @public
     */
    export declare type Provider = EthereumProvider | FilecoinProvider_2;

    /**
     * @public
     */
    export declare const provider: <Flavor extends keyof ConnectorsByName = "ethereum">(options?: FlavorOptions<Flavor>) => ConnectorsByName[Flavor]["provider"];

    declare interface Provider_2<ApiImplementation extends Api> {
        getOptions(): any;
        getInitialAccounts(): any;
    }

    /**
     * @public
     */
    export declare type ProviderOptions<T extends FlavorName = typeof DefaultFlavor> = FlavorOptions<T>;

    declare type ProviderOptions_2 = EthereumProviderOptions | EthereumLegacyProviderOptions;

    declare type PublicPrivate = "public" | "private";

    declare interface PutBatch<K = any, V = any> {
        readonly type: 'put';
        readonly key: K;
        readonly value: V;
    }

    declare interface PutBatch_2 {
        type: 'put';
        key: Buffer;
        value: Buffer;
    }

    declare type QUANTITY = string;

    declare class Quantity extends BaseJsonRpcType {
        static Empty: Quantity;
        static Zero: Quantity;
        static One: Quantity;
        static Gwei: Quantity;
        private static ZERO_VALUE_STRING;
        _nullable: boolean;
        static from(value: JsonRpcInputArg, nullable?: boolean): Quantity;
        constructor(value: JsonRpcInputArg, nullable?: boolean);
        toString(): string | null;
        toBuffer(): Buffer;
        toBigInt(): bigint | null;
        toNumber(): number;
        valueOf(): bigint;
        private findFirstNonZeroByteIndex;
        static toBuffer(value: JsonRpcInputArg, nullable?: boolean): Buffer;
        static toString(value: JsonRpcInputArg, nullable?: boolean): string;
        static toNumber(value: JsonRpcInputArg, nullable?: boolean): number;
        static toBigInt(value: JsonRpcInputArg, nullable?: boolean): bigint;
    }

    declare class QueryOffer extends SerializableObject<QueryOfferConfig> implements DeserializedObject<QueryOfferConfig> {
        get config(): Definitions<QueryOfferConfig>;
        constructor(options?: Partial<SerializedObject<QueryOfferConfig>> | Partial<DeserializedObject<QueryOfferConfig>>);
        err: string;
        root: RootCID;
        piece: RootCID;
        size: number;
        minPrice: bigint;
        unsealPrice: bigint;
        paymentInterval: number;
        paymentIntervalIncrease: number;
        miner: Address_3;
        minerPeer: RetrievalPeer;
    }

    declare type QueryOfferConfig = {
        properties: {
            err: {
                type: string;
                serializedType: string;
                serializedName: "Err";
            };
            root: {
                type: RootCID;
                serializedType: SerializedRootCID;
                serializedName: "Root";
            };
            piece: {
                type: RootCID;
                serializedType: SerializedRootCID;
                serializedName: "Piece";
            };
            size: {
                type: number;
                serializedType: number;
                serializedName: "Size";
            };
            minPrice: {
                type: bigint;
                serializedType: string;
                serializedName: "MinPrice";
            };
            unsealPrice: {
                type: bigint;
                serializedType: string;
                serializedName: "UnsealPrice";
            };
            paymentInterval: {
                type: number;
                serializedType: number;
                serializedName: "PaymentInterval";
            };
            paymentIntervalIncrease: {
                type: number;
                serializedType: number;
                serializedName: "PaymentIntervalIncrease";
            };
            miner: {
                type: Address_3;
                serializedType: SerializedAddress;
                serializedName: "Miner";
            };
            minerPeer: {
                type: RetrievalPeer;
                serializedType: SerializedRetrievalPeer;
                serializedName: "MinerPeer";
            };
        };
    };

    declare class RandomNumberGenerator {
        readonly rng: ReturnType<seedrandom.Callback>;
        constructor(seed?: string | null, state?: seedrandom.State);
        getNumber(upperExclusiveBound?: number): number;
        getNumbers(length: number, upperExclusiveBound?: number): number[];
        getBuffer(length: number): Buffer;
        state(): seedrandom.State;
    }

    declare type RangedStorageKeys = {
        keys: Buffer[];
        nextKey: Data;
    };

    declare type RangeFilterArgs = BaseFilterArgs & {
        fromBlock?: string | Tag;
        toBlock?: string | Tag;
    };

    declare const _raw: unique symbol;

    declare class ReadError extends LevelUPError {}

    /** Recognized string types, things C++ can read and understand as strings.
     * "String" does not have to mean "text", it can also be "binary".
     *
     * Ironically, JavaScript strings are the least performant of all options, to pass or receive to/from C++.
     * This because we expect UTF-8, which is packed in 8-byte chars. JavaScript strings are UTF-16 internally meaning extra copies and reinterpretation are required.
     *
     * That's why all events pass data by ArrayBuffer and not JavaScript strings, as they allow zero-copy data passing.
     *
     * You can always do Buffer.from(arrayBuffer).toString(), but keeping things binary and as ArrayBuffer is preferred.
     */
    declare type RecognizedString = string | ArrayBuffer | Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array;

    declare function recoverPersonalSignature<T extends MessageTypes>(msgParams: SignedMsgParams<TypedData | TypedMessage<T>>): string;

    declare function recoverTypedMessage<T extends MessageTypes>(msgParams: SignedMsgParams<TypedData | TypedMessage<T>>, version?: Version): string;

    declare function recoverTypedSignature<T extends MessageTypes>(msgParams: SignedMsgParams<TypedData | TypedMessage<T>>): string;

    declare function recoverTypedSignature_v4<T extends MessageTypes>(msgParams: SignedMsgParams<TypedData | TypedMessage<T>>): string;

    declare function recoverTypedSignatureLegacy<T extends MessageTypes>(msgParams: SignedMsgParams<TypedData | TypedMessage<T>>): string;

    declare type RejectableTask = {
        execute: (...args: any) => Promise<any>;
        reject: (reason?: any) => void;
    };

    declare type RemoveIndex<T> = {
        [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
    };

    /**
     * Returned if a transaction's gas price is below the minimum configured for the transaction pool.
     */
    declare const REPLACED = "transaction replaced by better transaction";

    /**
     * Responsible for managing global concurrent requests.
     */
    declare class RequestCoordinator {
        #private;
        /**
         * The number of concurrent requests. Set to null for no limit.
         */
        limit: number;
        /**
         * The pending requests. You can't do anything with this array.
         */
        readonly pending: RejectableTask[];
        /**
         * The number of tasks currently being processed.
         */
        runningTasks: number;
        get paused(): boolean;
        /**
         * Promise-based FIFO queue.
         * @param limit - The number of requests that can be processed at a time.
         * Default value is is no limit (`0`).
         */
        constructor(limit: number);
        /**
         * Pause processing. This will *not* cancel any promises that are currently
         * running.
         */
        pause: () => void;
        /**
         * Resume processing.
         */
        resume: () => void;
        /**
         * Stop processing tasks - calls to queue(), and resume() will reject with an
         * error indicating that Ganache is disconnected. This is an irreversible
         * action. If you wish to be able to resume processing, use pause() instead.
         *
         * Note: this changes the references of this.resume and this.queue. Any code
         * that maintains references to the values referenced by this.resume or
         * this.queue, could have unintended consequences after calling this.stop().
         */
        stop(): void;
        /**
         * Finalise shutdown of the RequestCoordinator. Rejects all pending tasks in order. Should be
         * called after all in-flight tasks have resolved in order to maintain overall FIFO order.
         */
        end(): void;
        /**
         * Insert a new function into the queue.
         */
        queue: <T extends (...args: unknown[]) => unknown>(fn: T, thisArgument: any, argumentsList: Parameters<T extends {
            (...args: infer A1): infer R1;
            (...args: infer A2): infer R2;
            (...args: infer A3): infer R3;
            (...args: infer A4): infer R4;
            (...args: infer A5): infer R5;
            (...args: infer A6): infer R6;
        } ? ((...args: A1) => R1) | ((...args: A2) => R2) | ((...args: A3) => R3) | ((...args: A4) => R4) | ((...args: A5) => R5) | ((...args: A6) => R6) : T extends {
            (...args: infer A1_1): infer R1_1;
            (...args: infer A2_1): infer R2_1;
            (...args: infer A3_1): infer R3_1;
            (...args: infer A4_1): infer R4_1;
            (...args: infer A5_1): infer R5_1;
        } ? ((...args: A1_1) => R1_1) | ((...args: A2_1) => R2_1) | ((...args: A3_1) => R3_1) | ((...args: A4_1) => R4_1) | ((...args: A5_1) => R5_1) : T extends {
            (...args: infer A1_2): infer R1_2;
            (...args: infer A2_2): infer R2_2;
            (...args: infer A3_2): infer R3_2;
            (...args: infer A4_2): infer R4_2;
        } ? ((...args: A1_2) => R1_2) | ((...args: A2_2) => R2_2) | ((...args: A3_2) => R3_2) | ((...args: A4_2) => R4_2) : T extends {
            (...args: infer A1_3): infer R1_3;
            (...args: infer A2_3): infer R2_3;
            (...args: infer A3_3): infer R3_3;
        } ? ((...args: A1_3) => R1_3) | ((...args: A2_3) => R2_3) | ((...args: A3_3) => R3_3) : T extends {
            (...args: infer A1_4): infer R1_4;
            (...args: infer A2_4): infer R2_4;
        } ? ((...args: A1_4) => R1_4) | ((...args: A2_4) => R2_4) : T extends (...args: infer A1_5) => infer R1_5 ? (...args: A1_5) => R1_5 : never> extends infer T_1 ? T_1 extends Parameters<T extends {
            (...args: infer A1): infer R1;
            (...args: infer A2): infer R2;
            (...args: infer A3): infer R3;
            (...args: infer A4): infer R4;
            (...args: infer A5): infer R5;
            (...args: infer A6): infer R6;
        } ? ((...args: A1) => R1) | ((...args: A2) => R2) | ((...args: A3) => R3) | ((...args: A4) => R4) | ((...args: A5) => R5) | ((...args: A6) => R6) : T extends {
            (...args: infer A1_1): infer R1_1;
            (...args: infer A2_1): infer R2_1;
            (...args: infer A3_1): infer R3_1;
            (...args: infer A4_1): infer R4_1;
            (...args: infer A5_1): infer R5_1;
        } ? ((...args: A1_1) => R1_1) | ((...args: A2_1) => R2_1) | ((...args: A3_1) => R3_1) | ((...args: A4_1) => R4_1) | ((...args: A5_1) => R5_1) : T extends {
            (...args: infer A1_2): infer R1_2;
            (...args: infer A2_2): infer R2_2;
            (...args: infer A3_2): infer R3_2;
            (...args: infer A4_2): infer R4_2;
        } ? ((...args: A1_2) => R1_2) | ((...args: A2_2) => R2_2) | ((...args: A3_2) => R3_2) | ((...args: A4_2) => R4_2) : T extends {
            (...args: infer A1_3): infer R1_3;
            (...args: infer A2_3): infer R2_3;
            (...args: infer A3_3): infer R3_3;
        } ? ((...args: A1_3) => R1_3) | ((...args: A2_3) => R2_3) | ((...args: A3_3) => R3_3) : T extends {
            (...args: infer A1_4): infer R1_4;
            (...args: infer A2_4): infer R2_4;
        } ? ((...args: A1_4) => R1_4) | ((...args: A2_4) => R2_4) : T extends (...args: infer A1_5) => infer R1_5 ? (...args: A1_5) => R1_5 : never> ? T_1 extends unknown ? never : T_1 : never : never) => Promise<{
            value: ReturnType<T>;
        }>;
    }

    declare type RequestMethods = KnownKeys<EthereumApi>;

    declare type RequestParams<Method extends RequestMethods> = {
        readonly method: Method;
        readonly params: OverloadedParameters<EthereumApi[Method]> | undefined;
    };

    declare type RequireOnly<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>;

    declare class RetrievalOrder extends SerializableObject<RetrievalOrderConfig> implements DeserializedObject<RetrievalOrderConfig> {
        get config(): Definitions<RetrievalOrderConfig>;
        constructor(options?: Partial<SerializedObject<RetrievalOrderConfig>> | Partial<DeserializedObject<RetrievalOrderConfig>>);
        root: RootCID;
        piece: RootCID;
        size: number;
        total: bigint;
        unsealPrice: bigint;
        paymentInterval: number;
        paymentIntervalIncrease: number;
        client: Address_3;
        miner: Address_3;
        minerPeer: RetrievalPeer;
    }

    declare type RetrievalOrderConfig = {
        properties: {
            root: {
                type: RootCID;
                serializedType: SerializedRootCID;
                serializedName: "Root";
            };
            piece: {
                type: RootCID;
                serializedType: SerializedRootCID;
                serializedName: "Piece";
            };
            size: {
                type: number;
                serializedType: number;
                serializedName: "Size";
            };
            total: {
                type: bigint;
                serializedType: string;
                serializedName: "Total";
            };
            unsealPrice: {
                type: bigint;
                serializedType: string;
                serializedName: "UnsealPrice";
            };
            paymentInterval: {
                type: number;
                serializedType: number;
                serializedName: "PaymentInterval";
            };
            paymentIntervalIncrease: {
                type: number;
                serializedType: number;
                serializedName: "PaymentIntervalIncrease";
            };
            client: {
                type: Address_3;
                serializedType: SerializedAddress;
                serializedName: "Client";
            };
            miner: {
                type: Address_3;
                serializedType: SerializedAddress;
                serializedName: "Miner";
            };
            minerPeer: {
                type: RetrievalPeer;
                serializedType: SerializedRetrievalPeer;
                serializedName: "MinerPeer";
            };
        };
    };

    declare class RetrievalPeer extends SerializableObject<RetrievalPeerConfig> implements DeserializedObject<RetrievalPeerConfig> {
        get config(): Definitions<RetrievalPeerConfig>;
        constructor(options?: Partial<SerializedObject<RetrievalPeerConfig>> | Partial<DeserializedObject<RetrievalPeerConfig>>);
        address: Address_3;
        id: string;
        pieceCID: RootCID;
    }

    declare type RetrievalPeerConfig = {
        properties: {
            address: {
                type: Address_3;
                serializedType: SerializedAddress;
                serializedName: "Address";
            };
            id: {
                type: string;
                serializedType: string;
                serializedName: "ID";
            };
            pieceCID: {
                type: RootCID;
                serializedType: SerializedRootCID;
                serializedName: "PieceCID";
            };
        };
    };

    declare enum RETURN_TYPES {
        TRANSACTION_HASH = 0,
        RETURN_VALUE = 1
    }

    declare class RootCID extends SerializableObject<RootCIDConfig> implements DeserializedObject<RootCIDConfig> {
        get config(): Definitions<RootCIDConfig>;
        constructor(options?: Partial<SerializedObject<RootCIDConfig>> | Partial<DeserializedObject<RootCIDConfig>>);
        asPath(): string;
        root: CID;
    }

    declare interface RootCIDConfig {
        properties: {
            root: {
                type: CID;
                serializedType: SerializedCID;
                serializedName: "/";
            };
        };
    }

    declare const RPC_MODULES: {
        readonly eth: "1.0";
        readonly net: "1.0";
        readonly rpc: "1.0";
        readonly web3: "1.0";
        readonly evm: "1.0";
        readonly personal: "1.0";
    };

    declare type RpcTransaction = {
        from: string;
        nonce?: string;
        gas?: string;
        gasLimit?: never;
        to?: string;
        value?: string;
        data?: string;
        input?: never;
    } | {
        from: string;
        nonce?: string;
        /**
         * Alias for `gas`
         */
        gasLimit?: string;
        gas?: never;
        to?: string;
        value?: string;
        data?: string;
        input?: never;
    } | {
        from: string;
        nonce?: string;
        gas?: string;
        gasLimit?: never;
        to?: string;
        value?: string;
        /**
         * Alias for `data`
         */
        input?: string;
        data?: never;
    } | {
        from: string;
        nonce?: string;
        /**
         * Alias for `gas`
         */
        gasLimit?: string;
        gas?: never;
        to?: string;
        value?: string;
        /**
         * Alias for `data`
         */
        input?: string;
        data?: never;
    } | {
        from?: string;
        nonce: string;
        gas?: string;
        gasLimit?: never;
        to?: string;
        value?: string;
        data?: string;
        input?: never;
        v: string;
        r: string;
        s: string;
    } | {
        from?: string;
        nonce: string;
        /**
         * Alias for `gas`
         */
        gasLimit?: string;
        gas?: never;
        to?: string;
        value?: string;
        data?: string;
        input?: never;
        v: string;
        r: string;
        s: string;
    } | {
        from?: string;
        nonce: string;
        gas?: string;
        gasLimit?: never;
        to?: string;
        value?: string;
        /**
         * Alias for `data`
         */
        input?: string;
        data?: never;
        v: string;
        r: string;
        s: string;
    } | {
        from?: string;
        nonce: string;
        /**
         * Alias for `gas`
         */
        gasLimit?: string;
        gas?: never;
        to?: string;
        value?: string;
        /**
         * Alias for `data`
         */
        input?: string;
        data?: never;
        v: string;
        r: string;
        s: string;
    };

    /**
     * Options for running a block.
     */
    declare interface RunBlockOpts {
        /**
         * The @ethereumjs/block to process
         */
        block: Block_3;
        /**
         * Root of the state trie
         */
        root?: Buffer;
        /**
         * Whether to generate the stateRoot and other related fields.
         * If `true`, `runBlock` will set the fields `stateRoot`, `receiptTrie`, `gasUsed`, and `bloom` (logs bloom) after running the block.
         * If `false`, `runBlock` throws if any fields do not match.
         * Defaults to `false`.
         */
        generate?: boolean;
        /**
         * If true, will skip "Block validation":
         * Block validation validates the header (with respect to the blockchain),
         * the transactions, the transaction trie and the uncle hash.
         */
        skipBlockValidation?: boolean;
        /**
         * if true, will skip "Header validation"
         * If the block has been picked from the blockchain to be executed,
         * header has already been validated, and can be skipped especially when
         * consensus of the chain has moved ahead.
         */
        skipHeaderValidation?: boolean;
        /**
         * If true, skips the nonce check
         */
        skipNonce?: boolean;
        /**
         * If true, checks the balance of the `from` account for the transaction and sets its
         * balance equal equal to the upfront cost (gas limit * gas price + transaction value)
         */
        skipBalance?: boolean;
        /**
         * For merge transition support, pass the chain TD up to the block being run
         */
        hardforkByTTD?: bigint;
    }

    /**
     * Result of {@link runBlock}
     */
    declare interface RunBlockResult {
        /**
         * Receipts generated for transactions in the block
         */
        receipts: TxReceipt[];
        /**
         * Results of executing the transactions in the block
         */
        results: RunTxResult[];
        /**
         * The stateRoot after executing the block
         */
        stateRoot: Buffer;
        /**
         * The gas used after executing the block
         */
        gasUsed: bigint;
        /**
         * The bloom filter of the LOGs (events) after executing the block
         */
        logsBloom: Buffer;
        /**
         * The receipt root after executing the block
         */
        receiptsRoot: Buffer;
    }

    /**
     * Immediate (unprocessed) result of running an EVM bytecode.
     */
    declare interface RunResult {
        logs: Log[];
        returnValue?: Buffer;
        /**
         * A map from the accounts that have self-destructed to the addresses to send their funds to
         */
        selfdestruct: {
            [k: string]: Buffer;
        };
    }

    declare interface RunState {
        programCounter: number;
        opCode: number;
        memory: Memory;
        memoryWordCount: bigint;
        highestMemCost: bigint;
        stack: Stack;
        returnStack: Stack;
        code: Buffer;
        shouldDoJumpAnalysis: boolean;
        validJumps: Uint8Array;
        eei: EEIInterface;
        env: Env;
        messageGasLimit?: bigint;
        interpreter: Interpreter;
        gasRefund: bigint;
        gasLeft: bigint;
        auth?: Address_2; /** EIP-3074 AUTH parameter */
        returnBuffer: Buffer;
    }

    /**
     * A minimal block that can be used by the EVM to run transactions.
     */
    declare class RuntimeBlock {
        private serializeBaseFeePerGas;
        readonly header: {
            parentHash: Buffer;
            difficulty: bigint;
            totalDifficulty: Buffer;
            coinbase: Address;
            number: bigint;
            gasLimit: bigint;
            gasUsed: bigint;
            timestamp: bigint;
            mixHash: Buffer;
            prevRandao: Buffer;
            baseFeePerGas: bigint | undefined;
        };
        constructor(number: Quantity, parentHash: Data, coinbase: Address, gasLimit: Quantity, gasUsed: Quantity, timestamp: Quantity, difficulty: Quantity, previousBlockTotalDifficulty: Quantity, mixHash: Buffer, baseFeePerGas: bigint | undefined);
        /**
         * Returns the serialization of all block data, the hash of the block header,
         * and a map of the hashed and raw storage keys
         */
        finalize(transactionsTrie: Buffer, receiptTrie: Buffer, bloom: Buffer, stateRoot: Buffer, gasUsed: bigint, extraData: Data, transactions: TypedTransaction[], storageKeys: StorageKeys): {
            block: Block;
            serialized: Buffer;
            storageKeys: StorageKeys;
            transactions: TypedTransaction[];
        };
    }

    declare class RuntimeError extends CodedError {
        code: JsonRpcErrorCode;
        data: {
            hash: string;
            programCounter: number;
            result: string;
            reason?: string;
            message: string;
        };
        constructor(transactionHash: Data, result: EVMResult, returnType: RETURN_TYPES);
    }

    /**
     * A RuntimeTransaction can be changed; its hash is not finalized and it is not
     * yet part of a block.
     */
    declare abstract class RuntimeTransaction extends BaseTransaction {
        hash: Data | null;
        /**
         * used by the miner to mark if this transaction is eligible for reordering or
         * removal
         */
        locked: boolean;
        logs: TransactionLog[];
        receipt: InternalTransactionReceipt;
        execException: RuntimeError;
        raw: TypedDatabaseTransaction | null;
        serialized: Buffer;
        encodedData: EncodedPart;
        encodedSignature: EncodedPart;
        private finalizer;
        private finalized;
        constructor(data: TypedDatabasePayload | Transaction, common: Common, extra?: GanacheRawExtraTx);
        /**
         * sign a transaction with a given private key, then compute and set the `hash`.
         *
         * @param privateKey - Must be 32 bytes in length
         */
        protected abstract signAndHash(privateKey: Buffer): any;
        serializeForDb(blockHash: Data, blockNumber: Quantity, transactionIndex: Quantity): Buffer;
        abstract toJSON(common: Common): any;
        /**
         * Initializes the receipt and logs
         * @param result -
         * @returns RLP encoded data for use in a transaction trie
         */
        fillFromResult(result: RunTxResult, cumulativeGasUsed: bigint): Buffer;
        getReceipt(): InternalTransactionReceipt;
        getLogs(): TransactionLog[];
        validateAndSetSignature: (data: Transaction) => void;
        /**
         * Returns a Promise that is resolved with the confirmation status and, if
         * appropriate, an error property.
         *
         * Note: it is possible to be confirmed AND have an error
         *
         * @param event - "finalized"
         */
        once(_event: "finalized"): Promise<TransactionFinalization>;
        /**
         * Mark this transaction as finalized, notifying all past and future
         * "finalized" event subscribers.
         *
         * Note:
         *
         * @param status -
         * @param error -
         */
        finalize(status: "confirmed" | "rejected", error?: Error): void;
        protected abstract toEthRawTransaction(v: Buffer, r: Buffer, s: Buffer): TypedDatabaseTransaction;
        protected abstract computeIntrinsics(v: Quantity, raw: TypedDatabaseTransaction, chainId: bigint): any;
        protected abstract toVmTransaction(): any;
        protected abstract updateEffectiveGasPrice(baseFeePerGas?: Quantity): any;
    }

    /**
     * Options for the `runTx` method.
     */
    declare interface RunTxOpts {
        /**
         * The `@ethereumjs/block` the `tx` belongs to.
         * If omitted, a default blank block will be used.
         */
        block?: Block_3;
        /**
         * An `@ethereumjs/tx` to run
         */
        tx: TypedTransaction_2;
        /**
         * If true, skips the nonce check
         */
        skipNonce?: boolean;
        /**
         * Skip balance checks if true. Adds transaction cost to balance to ensure execution doesn't fail.
         */
        skipBalance?: boolean;
        /**
         * If true, skips the validation of the tx's gas limit
         * against the block's gas limit.
         */
        skipBlockGasLimitValidation?: boolean;
        /**
         * If true, adds a generated EIP-2930 access list
         * to the `RunTxResult` returned.
         *
         * Option works with all tx types. EIP-2929 needs to
         * be activated (included in `berlin` HF).
         *
         * Note: if this option is used with a custom {@link StateManager} implementation
         * {@link StateManager.generateAccessList} must be implemented.
         */
        reportAccessList?: boolean;
        /**
         * To obtain an accurate tx receipt input the block gas used up until this tx.
         */
        blockGasUsed?: bigint;
    }

    /**
     * Execution result of a transaction
     */
    declare interface RunTxResult extends EVMResult {
        /**
         * Bloom filter resulted from transaction
         */
        bloom: Bloom;
        /**
         * The amount of ether used by this transaction
         */
        amountSpent: bigint;
        /**
         * The tx receipt
         */
        receipt: TxReceipt;
        /**
         * The amount of gas used in this transaction, which is paid for
         * This contains the gas units that have been used on execution, plus the upfront cost,
         * which consists of calldata cost, intrinsic cost and optionally the access list costs
         */
        totalGasSpent: bigint;
        /**
         * The amount of gas as that was refunded during the transaction (i.e. `gasUsed = totalGasConsumed - gasRefund`)
         */
        gasRefund: bigint;
        /**
         * EIP-2930 access list generated for the tx (see `reportAccessList` option)
         */
        accessList?: AccessList;
    }

    declare type Schema = {
        methods: {
            [propertyName: string]: {
                subscription?: boolean;
                namespace?: string;
            };
        };
    };

    /**
     * Options for sealing a block.
     */
    declare interface SealBlockOpts {
        /**
         * For PoW, the nonce.
         * Overrides the value passed in the constructor.
         */
        nonce?: Buffer;
        /**
         * For PoW, the mixHash.
         * Overrides the value passed in the constructor.
         */
        mixHash?: Buffer;
    }

    declare interface Serializable<C> {
        serialize(): C;
        equals(obj: Serializable<C>): boolean;
    }

    declare abstract class SerializableLiteral<C extends BaseConfig_2> implements Serializable<SerializedLiteral<C>> {
        protected abstract get config(): LiteralDefinition<C>;
        value: Literal<C>;
        constructor(literal?: SerializedLiteral<C>);
        private initialize;
        serialize(): SerializedLiteral<C>;
        equals(obj: Serializable<Literal<C>>): boolean;
    }

    declare abstract class SerializableObject<C extends BaseConfig> implements Serializable<SerializedObject<C>> {
        protected abstract get config(): Definitions<C>;
        initializeValue<N extends PropertyName<C>>(valueConfig: Definition<C, N>, options?: Partial<SerializedObject<C>> | Partial<DeserializedObject<C>>): PropertyType<C, N>;
        private serializeValue;
        serialize(): SerializedObject<C>;
        equals(obj: Serializable<SerializedObject<C>>): boolean;
        get cid(): CID;
    }

    declare type SerializedAddress = string;

    declare type SerializedBalance = string;

    declare type SerializedBeaconEntry = SerializedObject<BeaconEntryConfig>;

    declare type SerializedBlockHeader = SerializedObject<BlockHeaderConfig>;

    declare type SerializedBlockMessages = SerializedObject<BlockMessagesConfig>;

    declare type SerializedChannelID = SerializedObject<ChannelIDConfig>;

    declare type SerializedCID = string;

    declare type SerializedDataTransferChannel = SerializedObject<DataTransferChannelConfig>;

    declare type SerializedDealInfo = SerializedObject<DealInfoConfig>;

    declare type SerializedElectionProof = SerializedObject<ElectionProofConfig>;

    declare type SerializedFileRef = SerializedObject<FileRefConfig>;

    declare type SerializedKeyInfo = SerializedObject<KeyInfoConfig>;

    declare type SerializedLiteral<C extends BaseConfig_2> = C["type"] extends bigint | Buffer ? string : Literal<C>;

    declare type SerializedMessage = SerializedObject<MessageConfig>;

    declare type SerializedMessageSendSpec = SerializedObject<MessageSendSpecConfig>;

    declare type SerializedMinerInfo = SerializedObject<MinerInfoConfig>;

    declare type SerializedMinerPower = SerializedObject<MinerPowerConfig>;

    declare type SerializedObject<C extends BaseConfig> = FlattenUnion<Values<SerializedObjectWrapper<C>>>;

    declare type SerializedObjectWrapper<C extends BaseConfig> = {
        [N in PropertyName<C>]: {
            [S in SerializedPropertyName<C, N>]: SerializedPropertyType<C, N>;
        };
    };

    declare type SerializedPoStProof = SerializedObject<PoStProofConfig>;

    declare type SerializedPowerClaim = SerializedObject<PowerClaimConfig>;

    declare type SerializedPropertyName<C extends BaseConfig, N extends PropertyName<C> = PropertyName<C>> = C["properties"][N]["serializedName"];

    declare type SerializedPropertyType<C extends BaseConfig, N extends PropertyName<C> = PropertyName<C>> = C["properties"][N]["serializedType"];

    declare type SerializedQueryOffer = SerializedObject<QueryOfferConfig>;

    declare type SerializedRetrievalOrder = SerializedObject<RetrievalOrderConfig>;

    declare type SerializedRetrievalPeer = SerializedObject<RetrievalPeerConfig>;

    declare type SerializedRootCID = SerializedObject<RootCIDConfig>;

    declare type SerializedSignature = SerializedObject<SignatureConfig>;

    declare type SerializedSignedMessage = SerializedObject<SignedMessageConfig>;

    declare type SerializedStartDealParams = SerializedObject<StartDealParamsConfig>;

    declare type SerializedStorageMarketDataRef = SerializedObject<StorageMarketDataRefConfig>;

    declare type SerializedTicket = SerializedObject<TicketConfig>;

    declare type SerializedTipset = SerializedObject<TipsetConfig>;

    declare type SerializedVersion = SerializedObject<VersionConfig>;

    /**
     * @public
     */
    export declare class Server<Flavor extends FlavorName = typeof DefaultFlavor> extends Emittery<{
        open: undefined;
        close: undefined;
    }> {
        #private;
        get provider(): ConnectorsByName[Flavor]["provider"];
        get status(): number;
        constructor(providerAndServerOptions?: ServerOptions<Flavor>);
        private initialize;
        listen(port: number): Promise<void>;
        listen(port: number, host: string): Promise<void>;
        listen(port: number, callback: Callback_2): void;
        listen(port: number, host: string, callback: Callback_2): void;
        close(): Promise<void>;
    }

    /**
     * @public
     */
    export declare const server: <T extends keyof ConnectorsByName = "ethereum">(options?: ServerOptions<T>) => Server<T>;

    declare type ServerConfig = {
        options: {
            /**
             * Enable a websocket server.
             *
             * @defaultValue true
             */
            readonly ws: {
                type: boolean;
                hasDefault: true;
                legacy: {
                    /**
                     * @deprecated Use server.ws instead.
                     */
                    ws: boolean;
                };
            };
            /**
             * Whether or not websockets should response with binary data (ArrayBuffers) or
             * strings.
             *
             * Default is "auto", which responds using the same format as the incoming
             * message that triggered the response.
             *
             * @defaultValue "auto"
             */
            readonly wsBinary: {
                type: boolean | "auto";
                hasDefault: true;
            };
            /**
             * Defines the endpoint route the HTTP and WebSocket servers will listen on.
             *
             * @defaultValue "/"
             */
            readonly rpcEndpoint: {
                type: string;
                hasDefault: true;
            };
            /**
             * For memory and performance reasons ganache may respond with chunked
             * transfer-encoding over HTTP and fragmented send over WebSockets.
             * This option allows you to control the approximate size of each chunk.
             * The default is 1MB.
             */
            readonly chunkSize: {
                type: number;
                hasDefault: true;
            };
        };
    };

    /**
     * @public
     */
    export declare type ServerOptions<T extends FlavorName = typeof DefaultFlavor> = Partial<{
        [K in keyof Options_2]: ExternalConfig<Options_2[K]>;
    }> & ProviderOptions<T>;

    declare class Signature extends SerializableObject<SignatureConfig> implements DeserializedObject<SignatureConfig> {
        get config(): Definitions<SignatureConfig>;
        constructor(options?: Partial<SerializedObject<SignatureConfig>> | Partial<DeserializedObject<SignatureConfig>>);
        type: number;
        data: Buffer;
    }

    declare interface SignatureConfig {
        properties: {
            type: {
                type: SigType;
                serializedType: SigType;
                serializedName: "Type";
            };
            data: {
                type: Buffer;
                serializedType: string;
                serializedName: "Data";
            };
        };
    }

    declare class SignedMessage extends SerializableObject<SignedMessageConfig> implements DeserializedObject<SignedMessageConfig> {
        get config(): Definitions<SignedMessageConfig>;
        constructor(options?: Partial<SerializedObject<SignedMessageConfig>> | Partial<DeserializedObject<SignedMessageConfig>>);
        message: Message_2;
        signature: Signature;
        get cid(): CID;
    }

    declare type SignedMessageConfig = {
        properties: {
            message: {
                type: Message_2;
                serializedType: SerializedMessage;
                serializedName: "Message";
            };
            signature: {
                type: Signature;
                serializedType: SerializedSignature;
                serializedName: "Signature";
            };
        };
    };

    declare class SignedMessageManager extends Manager_2<SignedMessage, SignedMessageConfig> {
        static initialize(base: LevelUp): Promise<SignedMessageManager>;
        constructor(base: LevelUp);
        putSignedMessage(message: SignedMessage): Promise<void>;
    }

    declare type SignedMsgParams<D> = Required<MsgParams<D>>;

    declare function signTypedData<T extends MessageTypes>(privateKey: Buffer, msgParams: MsgParams<TypedData | TypedMessage<T>>): string;

    declare function signTypedData_v4<T extends MessageTypes>(privateKey: Buffer, msgParams: MsgParams<TypedData | TypedMessage<T>>): string;

    declare function signTypedDataLegacy<T extends MessageTypes>(privateKey: Buffer, msgParams: MsgParams<TypedData | TypedMessage<T>>): string;

    /**
     * A generic entry point for all typed data methods to be passed, includes a version parameter.
     */
    declare function signTypedMessage<T extends MessageTypes>(privateKey: Buffer, msgParams: MsgParams<TypedData | TypedMessage<T>>, version?: Version): string;

    declare enum SigType {
        SigTypeUnknown = 255,
        SigTypeSecp256k1 = 1,
        SigTypeBLS = 2
    }

    declare type Simplify<Type> = Promise<Type extends Promise<infer X> ? Externalize<X> : never>;

    declare type SimulationTransaction = {
        /**
         * The address the transaction is sent from.
         */
        from: Address;
        /**
         * The address the transaction is directed to.
         */
        to?: Address;
        /**
         * Integer of the gas provided for the transaction execution. eth_call consumes zero gas, but this parameter may be needed by some executions.
         */
        gas: Quantity;
        /**
         * Integer of the gasPrice used for each paid gas
         */
        gasPrice: Quantity;
        /**
         * Integer of the value sent with this transaction
         */
        value?: Quantity;
        /**
         * Hash of the method signature and encoded parameters. For details see Ethereum Contract ABI in the Solidity documentation
         */
        data?: Data;
        block: RuntimeBlock;
    };

    /**
     * Implementation of the stack used in evm.
     */
    declare class Stack {
        _store: bigint[];
        _maxHeight: number;
        constructor(maxHeight?: number);
        get length(): number;
        push(value: bigint): void;
        pop(): bigint;
        /**
         * Pop multiple items from stack. Top of stack is first item
         * in returned array.
         * @param num - Number of items to pop
         */
        popN(num?: number): bigint[];
        /**
         * Return items from the stack
         * @param num Number of items to return
         * @throws {@link ERROR.STACK_UNDERFLOW}
         */
        peek(num?: number): bigint[];
        /**
         * Swap top of stack with an item in the stack.
         * @param position - Index of item from top of the stack (0-indexed)
         */
        swap(position: number): void;
        /**
         * Pushes a copy of an item in the stack.
         * @param position - Index of item to be copied (1-indexed)
         */
        dup(position: number): void;
    }

    declare class StartDealParams extends SerializableObject<StartDealParamsConfig> implements DeserializedObject<StartDealParamsConfig> {
        get config(): Definitions<StartDealParamsConfig>;
        constructor(options?: Partial<SerializedObject<StartDealParamsConfig>> | Partial<DeserializedObject<StartDealParamsConfig>>);
        data: StorageMarketDataRef;
        wallet: Address_3 | null;
        miner: Address_3;
        epochPrice: bigint;
        minBlocksDuration: number;
        providerCollateral: bigint;
        dealStartEpoch: number;
        fastRetrieval: boolean;
        verifiedDeal: boolean;
    }

    declare type StartDealParamsConfig = {
        properties: {
            data: {
                type: StorageMarketDataRef;
                serializedType: SerializedStorageMarketDataRef;
                serializedName: "Data";
            };
            wallet: {
                type: Address_3 | null;
                serializedType: SerializedAddress | null;
                serializedName: "Wallet";
            };
            miner: {
                type: Address_3;
                serializedType: SerializedAddress;
                serializedName: "Miner";
            };
            epochPrice: {
                type: bigint;
                serializedType: string;
                serializedName: "EpochPrice";
            };
            minBlocksDuration: {
                type: number;
                serializedType: number;
                serializedName: "MinBlocksDuration";
            };
            providerCollateral: {
                type: bigint;
                serializedType: string;
                serializedName: "ProviderCollateral";
            };
            dealStartEpoch: {
                type: number;
                serializedType: number;
                serializedName: "dealStartEpoch";
            };
            fastRetrieval: {
                type: boolean;
                serializedType: boolean;
                serializedName: "FastRetrieval";
            };
            verifiedDeal: {
                type: boolean;
                serializedType: boolean;
                serializedName: "VerifiedDeal";
            };
        };
    };

    declare interface StateAccess {
        accountExists(address: Address_2): Promise<boolean>;
        getAccount(address: Address_2): Promise<Account_2>;
        putAccount(address: Address_2, account: Account_2): Promise<void>;
        accountIsEmpty(address: Address_2): Promise<boolean>;
        deleteAccount(address: Address_2): Promise<void>;
        modifyAccountFields(address: Address_2, accountFields: AccountFields): Promise<void>;
        putContractCode(address: Address_2, value: Buffer): Promise<void>;
        getContractCode(address: Address_2): Promise<Buffer>;
        getContractStorage(address: Address_2, key: Buffer): Promise<Buffer>;
        putContractStorage(address: Address_2, key: Buffer, value: Buffer): Promise<void>;
        clearContractStorage(address: Address_2): Promise<void>;
        checkpoint(): Promise<void>;
        commit(): Promise<void>;
        revert(): Promise<void>;
        getStateRoot(): Promise<Buffer>;
        setStateRoot(stateRoot: Buffer): Promise<void>;
        getProof?(address: Address_2, storageSlots: Buffer[]): Promise<Proof>;
        verifyProof?(proof: Proof): Promise<boolean>;
        hasStateRoot(root: Buffer): Promise<boolean>;
    }

    declare interface StateAccess_2 {
        accountExists(address: Address_2): Promise<boolean>;
        getAccount(address: Address_2): Promise<Account_2>;
        putAccount(address: Address_2, account: Account_2): Promise<void>;
        accountIsEmpty(address: Address_2): Promise<boolean>;
        deleteAccount(address: Address_2): Promise<void>;
        modifyAccountFields(address: Address_2, accountFields: AccountFields_2): Promise<void>;
        putContractCode(address: Address_2, value: Buffer): Promise<void>;
        getContractCode(address: Address_2): Promise<Buffer>;
        getContractStorage(address: Address_2, key: Buffer): Promise<Buffer>;
        putContractStorage(address: Address_2, key: Buffer, value: Buffer): Promise<void>;
        clearContractStorage(address: Address_2): Promise<void>;
        checkpoint(): Promise<void>;
        commit(): Promise<void>;
        revert(): Promise<void>;
        getStateRoot(): Promise<Buffer>;
        setStateRoot(stateRoot: Buffer): Promise<void>;
        getProof?(address: Address_2, storageSlots: Buffer[]): Promise<Proof_2>;
        verifyProof?(proof: Proof_2): Promise<boolean>;
        hasStateRoot(root: Buffer): Promise<boolean>;
    }

    declare interface StateManager extends StateAccess_2 {
        copy(): StateManager;
        flush(): Promise<void>;
        dumpStorage(address: Address_2): Promise<StorageDump>;
    }

    declare enum StorageDealStatus {
        Unknown = 0,
        ProposalNotFound = 1,
        ProposalRejected = 2,
        ProposalAccepted = 3,
        Staged = 4,
        Sealing = 5,
        Finalizing = 6,
        Active = 7,
        Expired = 8,
        Slashed = 9,
        Rejecting = 10,
        Failing = 11,
        FundsReserved = 12,
        CheckForAcceptance = 13,
        Validating = 14,
        AcceptWait = 15,
        StartDataTransfer = 16,
        Transferring = 17,
        WaitingForData = 18,
        VerifyData = 19,
        ReserveProviderFunds = 20,
        ReserveClientFunds = 21,
        ProviderFunding = 22,
        ClientFunding = 23,
        Publish = 24,
        Publishing = 25,
        Error = 26,
        ProviderTransferAwaitRestart = 27,
        ClientTransferRestart = 28,
        AwaitingPreCommit = 29
    }

    /**
     * Storage values of an account
     */
    declare interface StorageDump {
        [key: string]: string;
    }

    declare type StorageKeys = Map<string, {
        key: Buffer;
        hashedKey: Buffer;
    }>;

    declare class StorageMarketDataRef extends SerializableObject<StorageMarketDataRefConfig> implements DeserializedObject<StorageMarketDataRefConfig> {
        get config(): Definitions<StorageMarketDataRefConfig>;
        constructor(options?: Partial<SerializedObject<StorageMarketDataRefConfig>> | Partial<DeserializedObject<StorageMarketDataRefConfig>>);
        transferType: "graphsync";
        root: RootCID;
        pieceCid: RootCID | null;
        pieceSize: number;
    }

    declare type StorageMarketDataRefConfig = {
        properties: {
            transferType: {
                type: "graphsync";
                serializedType: "graphsync";
                serializedName: "TransferType";
            };
            root: {
                type: RootCID;
                serializedType: SerializedRootCID;
                serializedName: "Root";
            };
            pieceCid: {
                type: RootCID | null;
                serializedType: SerializedRootCID | null;
                serializedName: "PieceCid";
            };
            pieceSize: {
                type: number;
                serializedType: number;
                serializedName: "PieceSize";
            };
        };
    };

    declare type StoragePair = [key: PrefixedHexString, value: PrefixedHexString];

    declare type StorageProof = {
        key: PrefixedHexString;
        proof: PrefixedHexString[];
        value: PrefixedHexString;
    };

    declare type StorageProof_2 = {
        key: Data;
        proof: Data[];
        value: Quantity;
    };

    declare type StorageProof_3 = {
        key: PrefixedHexString;
        proof: PrefixedHexString[];
        value: PrefixedHexString;
    };

    declare type StorageRangeAtResult = {
        nextKey: Data | null;
        storage: StorageRecords;
    };

    declare type StorageRecords = Record<string, {
        key: Data;
        value: Data;
    }>;

    declare type StructLog = {
        depth: number;
        error: string;
        gas: Quantity;
        gasCost: number;
        memory: Array<ITraceData>;
        op: string;
        pc: number;
        stack: Array<ITraceData>;
        storage: TraceStorageMap;
    };

    declare interface Subscription {
        id: Quantity;
        unsubscribe: () => void;
    }

    declare type SubscriptionId = string;

    declare type SubscriptionId_2 = string;

    declare type SubscriptionName = "newHeads" | "newPendingTransactions" | "syncing" | "logs";

    declare interface SyncDynamicGasHandler {
        (runState: RunState, gas: bigint, common: Common): bigint;
    }

    declare interface SyncOpHandler {
        (runState: RunState, common: Common): void;
    }

    declare type Tag = keyof typeof InternalTag;

    declare namespace Tag {
        const earliest = "earliest";
        const finalized = "finalized";
        const latest = "latest";
        const safe = "safe";
        const pending = "pending";
    }

    declare type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;

    declare class Ticket extends SerializableObject<TicketConfig> implements DeserializedObject<TicketConfig> {
        get config(): Definitions<TicketConfig>;
        constructor(options?: Partial<SerializedObject<TicketConfig>> | Partial<DeserializedObject<TicketConfig>>);
        vrfProof: Buffer;
    }

    declare interface TicketConfig {
        properties: {
            vrfProof: {
                type: Buffer;
                serializedType: string;
                serializedName: "VRFProof";
            };
        };
    }

    declare class Tipset extends SerializableObject<TipsetConfig> implements DeserializedObject<TipsetConfig> {
        get config(): Definitions<TipsetConfig>;
        constructor(options?: Partial<SerializedObject<TipsetConfig>> | Partial<DeserializedObject<TipsetConfig>>);
        /**
         * An array that contains the BlockHeader.cid().
         * If not provided, constructor will auto add this array.
         * There's no documentation specifying this, so here is
         * the reference Implementation: https://git.io/Jt3VM
         */
        cids: Array<RootCID>;
        blocks: Array<BlockHeader_3>;
        height: number;
    }

    declare interface TipsetConfig {
        properties: {
            cids: {
                type: Array<RootCID>;
                serializedType: Array<SerializedRootCID>;
                serializedName: "Cids";
            };
            blocks: {
                type: Array<BlockHeader_3>;
                serializedType: Array<SerializedBlockHeader>;
                serializedName: "Blocks";
            };
            height: {
                type: number;
                serializedType: number;
                serializedName: "Height";
            };
        };
    }

    declare class TipsetManager extends Manager_2<Tipset, TipsetConfig> {
        #private;
        /**
         * The earliest tipset
         */
        earliest: Tipset | null;
        /**
         * The latest tipset
         */
        latest: Tipset | null;
        static initialize(base: LevelUp, blockHeaderManager: BlockHeaderManager): Promise<TipsetManager>;
        constructor(base: LevelUp, blockHeaderManager: BlockHeaderManager);
        /**
         * Writes the tipset object to the underlying database.
         * @param tipset -
         */
        putTipset(tipset: Tipset): Promise<void>;
        getTipsetWithBlocks(height: number): Promise<Tipset | null>;
        fillTipsetBlocks(tipset: Tipset): Promise<void>;
    }

    declare type Topic = string | string[];

    declare const toValidLengthAddress: (address: string, fieldName: string) => Address;

    declare const TraceDataFactory: () => {
        from: (value: Buffer) => ITraceData;
    };

    declare class TraceStorageMap extends Map<ITraceData, ITraceData> {
        toJSON(): Record<string, ITraceData>;
    }

    declare type TraceTransactionOptions = {
        disableStorage?: boolean;
        disableMemory?: boolean;
        disableStack?: boolean;
    };

    declare type TraceTransactionResult = {
        gas: Quantity;
        structLogs: StructLog[];
        returnValue: string;
        storage: Record<string, {
            key: Data;
            value: Data;
        }>;
    };

    declare type Transaction = LegacyRpcTransaction | EIP2930AccessListRpcTransaction | EIP1559FeeMarketRpcTransaction;

    /**
     * An Ethereum non-typed (legacy) transaction
     */
    declare class Transaction_2 extends BaseTransaction_2<Transaction_2> {
        readonly gasPrice: bigint;
        readonly common: Common;
        /**
         * Instantiate a transaction from a data dictionary.
         *
         * Format: { nonce, gasPrice, gasLimit, to, value, data, v, r, s }
         *
         * Notes:
         * - All parameters are optional and have some basic default values
         */
        static fromTxData(txData: TxData, opts?: TxOptions): Transaction_2;
        /**
         * Instantiate a transaction from the serialized tx.
         *
         * Format: `rlp([nonce, gasPrice, gasLimit, to, value, data, v, r, s])`
         */
        static fromSerializedTx(serialized: Buffer, opts?: TxOptions): Transaction_2;
        /**
         * Create a transaction from a values array.
         *
         * Format: `[nonce, gasPrice, gasLimit, to, value, data, v, r, s]`
         */
        static fromValuesArray(values: TxValuesArray, opts?: TxOptions): Transaction_2;
        /**
         * This constructor takes the values, validates them, assigns them and freezes the object.
         *
         * It is not recommended to use this constructor directly. Instead use
         * the static factory methods to assist in creating a Transaction object from
         * varying data types.
         */
        constructor(txData: TxData, opts?: TxOptions);
        /**
         * Returns a Buffer Array of the raw Buffers of the legacy transaction, in order.
         *
         * Format: `[nonce, gasPrice, gasLimit, to, value, data, v, r, s]`
         *
         * For legacy txs this is also the correct format to add transactions
         * to a block with {@link Block.fromValuesArray} (use the `serialize()` method
         * for typed txs).
         *
         * For an unsigned tx this method returns the empty Buffer values
         * for the signature parameters `v`, `r` and `s`. For an EIP-155 compliant
         * representation have a look at {@link Transaction.getMessageToSign}.
         */
        raw(): TxValuesArray;
        /**
         * Returns the serialized encoding of the legacy transaction.
         *
         * Format: `rlp([nonce, gasPrice, gasLimit, to, value, data, v, r, s])`
         *
         * For an unsigned tx this method uses the empty Buffer values for the
         * signature parameters `v`, `r` and `s` for encoding. For an EIP-155 compliant
         * representation for external signing use {@link Transaction.getMessageToSign}.
         */
        serialize(): Buffer;
        private _getMessageToSign;
        /**
         * Returns the unsigned tx (hashed or raw), which can be used
         * to sign the transaction (e.g. for sending to a hardware wallet).
         *
         * Note: the raw message message format for the legacy tx is not RLP encoded
         * and you might need to do yourself with:
         *
         * ```javascript
         * import { bufArrToArr } from '@ethereumjs/util'
         * import { RLP } from '@ethereumjs/rlp'
         * const message = tx.getMessageToSign(false)
         * const serializedMessage = Buffer.from(RLP.encode(bufArrToArr(message))) // use this for the HW wallet input
         * ```
         *
         * @param hashMessage - Return hashed message if set to true (default: true)
         */
        getMessageToSign(hashMessage: false): Buffer[];
        getMessageToSign(hashMessage?: true): Buffer;
        /**
         * The amount of gas paid for the data in this tx
         */
        getDataFee(): bigint;
        /**
         * The up front amount that an account must have for this transaction to be valid
         */
        getUpfrontCost(): bigint;
        /**
         * Computes a sha3-256 hash of the serialized tx.
         *
         * This method can only be used for signed txs (it throws otherwise).
         * Use {@link Transaction.getMessageToSign} to get a tx hash for the purpose of signing.
         */
        hash(): Buffer;
        /**
         * Computes a sha3-256 hash which can be used to verify the signature
         */
        getMessageToVerifySignature(): Buffer;
        /**
         * Returns the public key of the sender
         */
        getSenderPublicKey(): Buffer;
        /**
         * Process the v, r, s values from the `sign` method of the base transaction.
         */
        protected _processSignature(v: bigint, r: Buffer, s: Buffer): Transaction_2;
        /**
         * Returns an object with the JSON representation of the transaction.
         */
        toJSON(): JsonTx;
        /**
         * Validates tx's `v` value
         */
        private _validateTxV;
        /**
         * Return a compact error string representation of the object
         */
        errorStr(): string;
        /**
         * Internal helper function to create an annotated error message
         *
         * @param msg Base error message
         * @hidden
         */
        protected _errorMsg(msg: string): string;
    }

    /**
     * Returned if a replacement transaction is sent while the potentially replaced transaction is being mined.
     */
    declare const TRANSACTION_LOCKED = "transaction can't be replaced, mining has already started. (please open an issue with reproduction steps: https://github.com/trufflesuite/ganache/issues/new)";

    declare interface TransactionCache {
        hash: Buffer | undefined;
        dataFee?: {
            value: bigint;
            hardfork: string | Hardfork_2;
        };
    }

    declare class TransactionFactory {
        tx: TypedTransaction;
        constructor(raw: Buffer, common: Common);
        private static _fromData;
        /**
         * Create a transaction from a `txData` object
         *
         * @param txData - The rpc transaction data. The `type` field will determine which transaction type is returned (if undefined, creates a legacy transaction)
         * @param common - Options to pass on to the constructor of the transaction
         */
        static fromRpc(txData: Transaction, common: Common, extra?: GanacheRawExtraTx): LegacyTransaction | EIP2930AccessListTransaction | EIP1559FeeMarketTransaction;
        /**
         * Create a transaction from a `txData` object
         *
         * @param txData - The raw transaction data. The `type` field will determine which transaction type is returned (if undefined, creates a legacy transaction)
         * @param common - Options to pass on to the constructor of the transaction
         */
        static fromDatabaseTx(txData: TypedDatabaseTransaction, common: Common, extra?: GanacheRawExtraTx): LegacyTransaction | EIP2930AccessListTransaction | EIP1559FeeMarketTransaction;
        /**
         * Create a transaction from a `txData` object
         *
         * When transaction types are activated (EIP 2718) the txData will be checked
         * for a transaction envelope (first byte < 192) before determining the
         * decoding strategy, otherwise it will be decoded as a Legacy Transaction. If
         * the transaction contains a transaction envelop, but EIP 2718 is not active
         * decoding will fail and an exception will be thrown.
         *
         * @param txData - The raw hex string transaction data. The `type` field will determine which transaction type is returned (if undefined, creates a legacy transaction)
         * @param common - Options to pass on to the constructor of the transaction
         */
        static fromString(txData: string, common: Common): TypedTransaction;
        private static typeOf;
        static typeOfRaw(raw: TypedDatabaseTransaction): TransactionType;
        static typeOfRPC(rpc: Transaction): TransactionType;
    }

    declare type TransactionFinalization = {
        status: "confirmed";
        error?: Error;
    } | {
        status: "rejected";
        error: Error;
    };

    declare type TransactionLog = [
    address: Buffer,
    topics: Buffer[],
    data: Buffer | Buffer[]
    ];

    declare class TransactionManager extends Manager<NoOp> {
        #private;
        readonly transactionPool: TransactionPool;
        constructor(options: EthereumInternalOptions["miner"], common: Common, blockchain: Blockchain, base: GanacheLevelUp);
        fromFallback: (transactionHash: Buffer) => Promise<Buffer>;
        getRaw(transactionHash: Buffer): Promise<Buffer>;
        get(key: string | Buffer): Promise<TypedTransaction>;
        /**
         * Adds the transaction to the transaction pool.
         *
         * Returns a promise that is only resolved in the order it was added.
         *
         * @param transaction -
         * @param secretKey -
         * @returns `true` if the `transaction` is immediately executable, `false` if
         * it may be valid in the future. Throws if the transaction is invalid.
         */
        add(transaction: TypedTransaction, secretKey?: Data): Promise<boolean>;
        /**
         * Immediately ignores all transactions that were in the process of being
         * added to the pool. These transactions' `push` promises will be resolved
         * immediately with the value `false` and will _not_ be added to the pool.
         *
         * Also clears all transactions that were already added to the pool.
         *
         * Transactions that are currently in the process of being mined may still be
         * mined.
         */
        clear(): void;
        /**
         * Stop processing _new_ transactions; puts new requests in a queue. Has no
         * affect if already paused.
         */
        pause(): Promise<void>;
        /**
         * Resume processing transactions. Has no effect if not paused.
         */
        resume: () => void;
    }

    declare class TransactionPool extends Emittery<{
        drain: undefined;
    }> {
        #private;
        constructor(options: EthereumInternalOptions["miner"], blockchain: Blockchain, origins?: Map<string, Heap<TypedTransaction>>);
        readonly executables: Executables;
        readonly origins: Map<string, Heap<TypedTransaction>>;
        /**
         * Inserts a transaction into the pending queue, if executable, or future pool
         * if not.
         *
         * @param transaction -
         * @param secretKey -
         * @returns data that can be used to drain the queue
         */
        prepareTransaction(transaction: TypedTransaction, secretKey?: Data): Promise<boolean>;
        clear(): void;
        /**
         * Returns the transaction matching the given hash.
         *
         * This isn't the fastest thing... but querying for pending transactions is
         * likely rare, so leaving this slow so other code paths can be faster might
         * be okay.
         *
         * @param transactionHash -
         */
        find(transactionHash: Buffer): TypedTransaction;
        readonly drain: () => void;
    }

    declare interface TransactionReceipt {
        transactionHash: Data;
        transactionIndex: Quantity;
        blockNumber: Quantity;
        blockHash: Data;
        from: Address;
        to: Address;
        cumulativeGasUsed: Quantity;
        gasUsed: Quantity;
        contractAddress: Data;
        logs: {
            address: Address;
            blockHash: Data;
            blockNumber: Quantity;
            data: Data | Data[];
            logIndex: Quantity;
            removed: boolean;
            topics: Data | Data[];
            transactionHash: Data;
            transactionIndex: Quantity;
        }[];
        logsBloom: Data;
        status: Quantity;
        type?: Quantity;
        chainId?: Quantity;
        accessList?: AccessList;
        effectiveGasPrice: Quantity;
    }

    declare class TransactionReceiptManager extends Manager<InternalTransactionReceipt> {
        #private;
        constructor(base: GanacheLevelUp, blockchain: Blockchain);
        get(key: string | Buffer): Promise<InternalTransactionReceipt>;
    }

    /**
     * TransactionsBuffer can be an array of serialized txs for Typed Transactions or an array of Buffer Arrays for legacy transactions.
     */
    declare type TransactionsBuffer = Buffer[][] | Buffer[];

    declare enum TransactionType {
        Legacy = 0,
        EIP2930AccessList = 1,
        EIP1559AccessList = 2
    }

    declare namespace TransactionTypes {
        export {
            EIP2930AccessListTransaction,
            EIP1559FeeMarketTransaction,
            calculateIntrinsicGas,
            BaseTransaction,
            Hardfork_3 as Hardfork,
            LegacyTransaction,
            Params,
            LegacyDatabasePayload,
            EIP2930AccessListDatabasePayload,
            EIP1559FeeMarketDatabasePayload,
            EIP2930AccessListDatabaseTx,
            EIP1559FeeMarketDatabaseTx,
            TypedDatabaseTransaction,
            TypedDatabasePayload,
            GanacheRawExtraTx,
            GanacheRawBlockTransactionMetaData,
            Transaction,
            CallTransaction,
            LegacyRpcTransaction,
            EIP2930AccessListRpcTransaction,
            EIP1559FeeMarketRpcTransaction,
            RpcTransaction,
            toValidLengthAddress,
            hasPartialSignature,
            RuntimeTransaction,
            TransactionReceipt,
            InternalTransactionReceipt,
            TransactionType,
            TransactionFactory,
            TypedTransaction,
            Capability,
            TypedTransactionJSON,
            LegacyTransactionJSON,
            EIP2930AccessListTransactionJSON,
            EIP1559FeeMarketTransactionJSON,
            VmTransaction
        }
    }

    declare interface TransformableToBuffer {
        toBuffer(): Buffer;
        toArray?(): Uint8Array;
    }

    declare class TransientStorage implements TransientStorageInterface {
        /**
         * The current values of the transient storage, keyed by contract address and then slot
         */
        private _storage;
        /**
         * Each change to storage is recorded in the journal. This is never cleared.
         */
        private _changeJournal;
        /**
         * The length of the journal at the beginning of each call in the call stack.
         */
        private _indices;
        /**
         * Get the value for the given address and key
         * @param addr the address for which transient storage is accessed
         * @param key the key of the address to get
         */
        get(addr: Address_2, key: Buffer): Buffer;
        /**
         * Put the given value for the address and key
         * @param addr the address of the contract for which the key is being set
         * @param key the slot to set for the address
         * @param value the new value of the transient storage slot to set
         */
        put(addr: Address_2, key: Buffer, value: Buffer): void;
        /**
         * Commit all the changes since the last checkpoint
         */
        commit(): void;
        /**
         * To be called whenever entering a new context. If revert is called after checkpoint, all changes after the latest checkpoint are reverted.
         */
        checkpoint(): void;
        /**
         * Revert transient storage to the last checkpoint
         */
        revert(): void;
        /**
         * Create a JSON representation of the current transient storage state
         */
        toJSON(): {
            [address: string]: {
                [key: string]: string;
            };
        };
        /**
         * Clear transient storage state.
         */
        clear(): void;
    }

    declare interface TransientStorageInterface {
        get(addr: Address_2, key: Buffer): Buffer;
        put(addr: Address_2, key: Buffer, value: Buffer): void;
        commit(): void;
        checkpoint(): void;
        revert(): void;
        toJSON(): {
            [address: string]: {
                [key: string]: string;
            };
        };
        clear(): void;
    }

    /**
     * The basic trie interface, use with `import { Trie } from '@ethereumjs/trie'`.
     * In Ethereum applications stick with the {@link SecureTrie} overlay.
     * The API for the base and the secure interface are about the same.
     */
    declare class Trie {
        private readonly _opts;
        /** The root for an empty trie */
        EMPTY_TRIE_ROOT: Buffer;
        /** The backend DB */
        protected _db: CheckpointDB;
        protected _hashLen: number;
        protected _lock: Lock;
        protected _root: Buffer;
        /**
         * Create a new trie
         * @param opts Options for instantiating the trie
         */
        constructor(opts?: TrieOpts);
        static create(opts?: TrieOpts): Promise<Trie>;
        database(db?: DB): CheckpointDB;
        /**
         * Gets and/or Sets the current root of the `trie`
         */
        root(value?: Buffer | null): Buffer;
        /**
         * Checks if a given root exists.
         */
        checkRoot(root: Buffer): Promise<boolean>;
        /**
         * Gets a value given a `key`
         * @param key - the key to search for
         * @param throwIfMissing - if true, throws if any nodes are missing. Used for verifying proofs. (default: false)
         * @returns A Promise that resolves to `Buffer` if a value was found or `null` if no value was found.
         */
        get(key: Buffer, throwIfMissing?: boolean): Promise<Buffer | null>;
        /**
         * Stores a given `value` at the given `key` or do a delete if `value` is empty
         * (delete operations are only executed on DB with `deleteFromDB` set to `true`)
         * @param key
         * @param value
         * @returns A Promise that resolves once value is stored.
         */
        put(key: Buffer, value: Buffer): Promise<void>;
        /**
         * Deletes a value given a `key` from the trie
         * (delete operations are only executed on DB with `deleteFromDB` set to `true`)
         * @param key
         * @returns A Promise that resolves once value is deleted.
         */
        del(key: Buffer): Promise<void>;
        /**
         * Tries to find a path to the node for the given key.
         * It returns a `stack` of nodes to the closest node.
         * @param key - the search key
         * @param throwIfMissing - if true, throws if any nodes are missing. Used for verifying proofs. (default: false)
         */
        findPath(key: Buffer, throwIfMissing?: boolean): Promise<Path>;
        /**
         * Walks a trie until finished.
         * @param root
         * @param onFound - callback to call when a node is found. This schedules new tasks. If no tasks are available, the Promise resolves.
         * @returns Resolves when finished walking trie.
         */
        walkTrie(root: Buffer, onFound: FoundNodeFunction): Promise<void>;
        /**
         * Creates the initial node from an empty tree.
         * @private
         */
        _createInitialNode(key: Buffer, value: Buffer): Promise<void>;
        /**
         * Retrieves a node from db by hash.
         */
        lookupNode(node: Buffer | Buffer[]): Promise<TrieNode | null>;
        /**
         * Updates a node.
         * @private
         * @param key
         * @param value
         * @param keyRemainder
         * @param stack
         */
        _updateNode(k: Buffer, value: Buffer, keyRemainder: Nibbles, stack: TrieNode[]): Promise<void>;
        /**
         * Deletes a node from the trie.
         * @private
         */
        _deleteNode(k: Buffer, stack: TrieNode[]): Promise<void>;
        /**
         * Saves a stack of nodes to the database.
         * @private
         * @param key - the key. Should follow the stack
         * @param stack - a stack of nodes to the value given by the key
         * @param opStack - a stack of levelup operations to commit at the end of this funciton
         */
        _saveStack(key: Nibbles, stack: TrieNode[], opStack: BatchDBOp[]): Promise<void>;
        /**
         * Formats node to be saved by `levelup.batch`.
         * @private
         * @param node - the node to format.
         * @param topLevel - if the node is at the top level.
         * @param opStack - the opStack to push the node's data.
         * @param remove - whether to remove the node
         * @returns The node's hash used as the key or the rawNode.
         */
        _formatNode(node: TrieNode, topLevel: boolean, opStack: BatchDBOp[], remove?: boolean): Buffer | (EmbeddedNode | null)[];
        /**
         * The given hash of operations (key additions or deletions) are executed on the trie
         * (delete operations are only executed on DB with `deleteFromDB` set to `true`)
         * @example
         * const ops = [
         *    { type: 'del', key: Buffer.from('father') }
         *  , { type: 'put', key: Buffer.from('name'), value: Buffer.from('Yuri Irsenovich Kim') }
         *  , { type: 'put', key: Buffer.from('dob'), value: Buffer.from('16 February 1941') }
         *  , { type: 'put', key: Buffer.from('spouse'), value: Buffer.from('Kim Young-sook') }
         *  , { type: 'put', key: Buffer.from('occupation'), value: Buffer.from('Clown') }
         * ]
         * await trie.batch(ops)
         * @param ops
         */
        batch(ops: BatchDBOp[]): Promise<void>;
        /**
         * Saves the nodes from a proof into the trie.
         * @param proof
         */
        fromProof(proof: Proof_3): Promise<void>;
        /**
         * Creates a proof from a trie and key that can be verified using {@link Trie.verifyProof}.
         * @param key
         */
        createProof(key: Buffer): Promise<Proof_3>;
        /**
         * Verifies a proof.
         * @param rootHash
         * @param key
         * @param proof
         * @throws If proof is found to be invalid.
         * @returns The value from the key, or null if valid proof of non-existence.
         */
        verifyProof(rootHash: Buffer, key: Buffer, proof: Proof_3): Promise<Buffer | null>;
        /**
         * {@link verifyRangeProof}
         */
        verifyRangeProof(rootHash: Buffer, firstKey: Buffer | null, lastKey: Buffer | null, keys: Buffer[], values: Buffer[], proof: Buffer[] | null): Promise<boolean>;
        verifyPrunedIntegrity(): Promise<boolean>;
        /**
         * The `data` event is given an `Object` that has two properties; the `key` and the `value`. Both should be Buffers.
         * @return Returns a [stream](https://nodejs.org/dist/latest-v12.x/docs/api/stream.html#stream_class_stream_readable) of the contents of the `trie`
         */
        createReadStream(): TrieReadStream;
        /**
         * Returns a copy of the underlying trie.
         * @param includeCheckpoints - If true and during a checkpoint, the copy will contain the checkpointing metadata and will use the same scratch as underlying db.
         */
        copy(includeCheckpoints?: boolean): Trie;
        /**
         * Persists the root hash in the underlying database
         */
        persistRoot(): Promise<void>;
        /**
         * Finds all nodes that are stored directly in the db
         * (some nodes are stored raw inside other nodes)
         * called by {@link ScratchReadStream}
         * @private
         */
        _findDbNodes(onFound: FoundNodeFunction): Promise<void>;
        /**
         * Returns the key practically applied for trie construction
         * depending on the `useKeyHashing` option being set or not.
         * @param key
         */
        protected appliedKey(key: Buffer): Buffer;
        protected hash(msg: Uint8Array): Buffer;
        /**
         * Is the trie during a checkpoint phase?
         */
        hasCheckpoints(): boolean;
        /**
         * Creates a checkpoint that can later be reverted to or committed.
         * After this is called, all changes can be reverted until `commit` is called.
         */
        checkpoint(): void;
        /**
         * Commits a checkpoint to disk, if current checkpoint is not nested.
         * If nested, only sets the parent checkpoint as current checkpoint.
         * @throws If not during a checkpoint phase
         */
        commit(): Promise<void>;
        /**
         * Reverts the trie to the state it was at when `checkpoint` was first called.
         * If during a nested checkpoint, sets root to most recent checkpoint, and sets
         * parent checkpoint as current.
         */
        revert(): Promise<void>;
        /**
         * Flushes all checkpoints, restoring the initial checkpoint state.
         */
        flushCheckpoints(): void;
    }

    /**
     * `@ethereumjs/trie` requires that any database passed to it implements a `DB`.
     * The `DB` interface defines the minimum set of database access methods that
     * ethereumjs needs internally. We implement that interface in `TrieDB`, as well
     * as a few other methods that we use in Ganache internally.
     */
    declare class TrieDB implements DB {
        readonly _db: GanacheLevelUp;
        constructor(db: GanacheLevelUp);
        get(key: Buffer): Promise<Buffer | null>;
        put(key: Buffer, val: Buffer): Promise<void>;
        del(key: Buffer): Promise<void>;
        batch(opStack: BatchDBOp[]): Promise<void>;
        copy(): TrieDB;
        close(): Promise<void>;
        sublevel(prefix: string, options: object): GanacheLevelUp;
        createReadStream(options?: AbstractIteratorOptions_2<Buffer, Buffer>): NodeJS.ReadableStream;
    }

    declare type TrieNode = BranchNode | ExtensionNode | LeafNode;

    declare interface TrieOpts {
        /**
         * A database instance.
         */
        db?: DB;
        /**
         * A `Buffer` for the root of a previously stored trie
         */
        root?: Buffer;
        /**
         * Create as a secure Trie where the keys are automatically hashed using the
         * **keccak256** hash function or alternatively the custom hash function provided.
         * Default: `false`
         *
         * This is the flavor of the Trie which is used in production Ethereum networks
         * like Ethereum Mainnet.
         *
         * Note: This functionality has been refactored along the v5 release and was before
         * provided as a separate inherited class `SecureTrie`. Just replace with `Trie`
         * instantiation with `useKeyHashing` set to `true`.
         */
        useKeyHashing?: boolean;
        /**
         * Hash function used for hashing trie node and securing key.
         */
        useKeyHashingFunction?: HashKeysFunction;
        /**
         * Store the root inside the database after every `write` operation
         */
        useRootPersistence?: boolean;
        /**
         * Flag to prune the trie. When set to `true`, each time a value is overridden,
         * unreachable nodes will be pruned (deleted) from the trie
         */
        useNodePruning?: boolean;
    }

    declare class TrieReadStream extends Readable {
        private trie;
        private _started;
        constructor(trie: Trie);
        _read(): Promise<void>;
        /**
         * Finds all nodes that store k,v values
         * called by {@link TrieReadStream}
         * @private
         */
        _findValueNodes(onFound: FoundNodeFunction): Promise<void>;
    }

    declare type TupleFromUnion<Union> = TupleFromUnionRec<Union, []>;

    declare type TupleFromUnionRec<RemainingUnion, CurrentTuple extends readonly unknown[]> = [RemainingUnion] extends [never] ? CurrentTuple : TupleFromUnionRec<UnionExcludingLast<RemainingUnion>, TuplePrepend<CurrentTuple, UnionLast<RemainingUnion>>>;

    declare type TuplePrepend<Tuple extends readonly unknown[], NewElement> = [
    NewElement,
    ...Tuple
    ];

    /**
     * Legacy {@link Transaction} Data
     */
    declare type TxData = {
        /**
         * The transaction's nonce.
         */
        nonce?: BigIntLike;
        /**
         * The transaction's gas price.
         */
        gasPrice?: BigIntLike;
        /**
         * The transaction's gas limit.
         */
        gasLimit?: BigIntLike;
        /**
         * The transaction's the address is sent to.
         */
        to?: AddressLike;
        /**
         * The amount of Ether sent.
         */
        value?: BigIntLike;
        /**
         * This will contain the data of the message or the init of a contract.
         */
        data?: BufferLike;
        /**
         * EC recovery ID.
         */
        v?: BigIntLike;
        /**
         * EC signature parameter.
         */
        r?: BigIntLike;
        /**
         * EC signature parameter.
         */
        s?: BigIntLike;
        /**
         * The transaction type
         */
        type?: BigIntLike;
    };

    /**
     * The options for initializing a {@link Transaction}.
     */
    declare interface TxOptions {
        /**
         * A {@link Common} object defining the chain and hardfork for the transaction.
         *
         * Object will be internally copied so that tx behavior don't incidentally
         * change on future HF changes.
         *
         * Default: {@link Common} object set to `mainnet` and the default hardfork as defined in the {@link Common} class.
         *
         * Current default hardfork: `istanbul`
         */
        common?: Common;
        /**
         * A transaction object by default gets frozen along initialization. This gives you
         * strong additional security guarantees on the consistency of the tx parameters.
         * It also enables tx hash caching when the `hash()` method is called multiple times.
         *
         * If you need to deactivate the tx freeze - e.g. because you want to subclass tx and
         * add additional properties - it is strongly encouraged that you do the freeze yourself
         * within your code instead.
         *
         * Default: true
         */
        freeze?: boolean;
    }

    declare type TxReceipt = PreByzantiumTxReceipt | PostByzantiumTxReceipt;

    declare type TxType = [type: Buffer];

    declare type TxType_2 = `0x${HexChar}` | `0x${HexPair}`;

    /**
     * Buffer values array for a legacy {@link Transaction}
     */
    declare type TxValuesArray = Buffer[];

    declare const TYPED_MESSAGE_SCHEMA: {
        type: string;
        properties: {
            types: {
                type: string;
                additionalProperties: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            name: {
                                type: string;
                            };
                            type: {
                                type: string;
                            };
                        };
                        required: string[];
                    };
                };
            };
            primaryType: {
                type: string;
            };
            domain: {
                type: string;
            };
            message: {
                type: string;
            };
        };
        required: string[];
    };

    declare type TypedData = string | EIP712TypedData | EIP712TypedData[];

    declare type TypedDatabasePayload = LegacyDatabasePayload | EIP2930AccessListDatabasePayload | EIP1559FeeMarketDatabasePayload;

    declare type TypedDatabaseTransaction = LegacyDatabasePayload | EIP2930AccessListDatabaseTx | EIP1559FeeMarketDatabaseTx;

    /**
     * A collection of utility functions used for signing typed data
     */
    declare const TypedDataUtils: {
        /**
         * Encodes an object by encoding and concatenating each of its members
         *
         * @param {string} primaryType - Root type
         * @param {Object} data - Object to encode
         * @param {Object} types - Type definitions
         * @returns {Buffer} - Encoded representation of an object
         */
        encodeData(primaryType: string, data: object, types: object, useV4?: boolean): Buffer;
        /**
         * Encodes the type of an object by encoding a comma delimited list of its members
         *
         * @param {string} primaryType - Root type to encode
         * @param {Object} types - Type definitions
         * @returns {string} - Encoded representation of the type of an object
         */
        encodeType(primaryType: string, types: object): string;
        /**
         * Finds all types within a type definition object
         *
         * @param {string} primaryType - Root type
         * @param {Object} types - Type definitions
         * @param {Array} results - current set of accumulated types
         * @returns {Array} - Set of all types found in the type definition
         */
        findTypeDependencies(primaryType: string, types: object, results?: string[]): string[];
        /**
         * Hashes an object
         *
         * @param {string} primaryType - Root type
         * @param {Object} data - Object to hash
         * @param {Object} types - Type definitions
         * @returns {Buffer} - Hash of an object
         */
        hashStruct(primaryType: string, data: object, types: object, useV4?: boolean): Buffer;
        /**
         * Hashes the type of an object
         *
         * @param {string} primaryType - Root type to hash
         * @param {Object} types - Type definitions
         * @returns {Buffer} - Hash of an object
         */
        hashType(primaryType: string, types: object): Buffer;
        /**
         * Removes properties from a message object that are not defined per EIP-712
         *
         * @param {Object} data - typed message object
         * @returns {Object} - typed message object with only allowed fields
         */
        sanitizeData<T extends MessageTypes>(data: string | EIP712TypedData | EIP712TypedData[] | TypedMessage<T>): TypedMessage<T>;
        /**
         * Signs a typed message as per EIP-712 and returns its sha3 hash
         *
         * @param {Object} typedData - Types message data to sign
         * @returns {Buffer} - sha3 hash of the resulting signed message
         */
        sign<T_1 extends MessageTypes>(typedData: string | Partial<EIP712TypedData> | EIP712TypedData[] | Partial<TypedMessage<T_1>>, useV4?: boolean): Buffer;
    };

    declare interface TypedMessage<T extends MessageTypes> {
        types: T;
        primaryType: keyof T;
        domain: {
            name?: string;
            version?: string;
            chainId?: number;
            verifyingContract?: string;
        };
        message: object;
    }

    declare type TypedTransaction = LegacyTransaction | EIP2930AccessListTransaction | EIP1559FeeMarketTransaction;

    /**
     * Encompassing type for all transaction types.
     *
     * Note that this also includes legacy txs which are
     * referenced as {@link Transaction} for compatibility reasons.
     */
    declare type TypedTransaction_2 = Transaction_2 | AccessListEIP2930Transaction | FeeMarketEIP1559Transaction;

    declare type TypedTransactionJSON = LegacyTransactionJSON | EIP2930AccessListTransactionJSON | EIP1559FeeMarketTransactionJSON;

    declare type UncleHeadersBuffer = Buffer[][];

    declare type UnconstrainedOptionName<C extends Base.Config> = string & keyof UnconstrainedOptions<C>;

    declare type UnconstrainedOptions<C extends Base.Config> = Omit<Options<C>, ExclusiveGroupOptionName<C>>;

    declare type UnconstrainedOptionsByType<C extends Base.Config, T extends "type" | "rawType"> = {
        [N in UnconstrainedOptionName<C>]: T extends "type" ? OptionType<C, N> : OptionRawType<C, N>;
    };

    /**
     * Returned if a transaction's gas price is below the minimum configured for the transaction pool.
     */
    declare const UNDERPRICED = "transaction underpriced";

    declare type UnionExcludingLast<Union> = Exclude<Union, UnionLast<Union>>;

    declare type UnionLast<Union> = OverloadedConsumerFromUnion<Union> extends (a: infer A) => void ? A : never;

    declare type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

    declare type UnionToIntersection_2<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

    declare type UnionToIntersection_3<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

    declare type UnionToTuple<T> = ((T extends any ? (t: T) => T : never) extends infer U ? (U extends any ? (u: U) => any : never) extends (v: infer V) => any ? V : never : never) extends (_: any) => infer W ? [...UnionToTuple<Exclude<T, W>>, W] : [];

    declare namespace UtilTypes {
        export {
            CodedError,
            INVALID_SENDER,
            NONCE_TOO_LOW,
            UNDERPRICED,
            REPLACED,
            INTRINSIC_GAS_TOO_LOW,
            GAS_LIMIT,
            VM_EXCEPTION,
            VM_EXCEPTIONS,
            TRANSACTION_LOCKED,
            INSUFFICIENT_FUNDS,
            RETURN_TYPES,
            RuntimeError,
            CallError,
            AbortError,
            EthereumRawAccount,
            Account,
            TransactionLog,
            BlockLog,
            Log_2 as Log,
            BlockLogs,
            InternalTag,
            Tag,
            ITraceData,
            TraceDataFactory,
            TraceStorageMap,
            StorageRecords,
            StorageRangeAtResult,
            StorageKeys,
            RangedStorageKeys,
            ExtractValuesFromType,
            FilterTypes,
            Topic,
            BaseFilterArgs,
            BlockHashFilterArgs,
            RangeFilterArgs,
            FilterArgs,
            InternalFilter,
            QUANTITY,
            DATA,
            WhisperPostObject,
            SubscriptionId,
            SubscriptionName,
            TraceTransactionOptions,
            StructLog,
            TraceTransactionResult,
            TupleFromUnion,
            StorageProof_2 as StorageProof,
            AccountProof,
            FeeHistory
        }
    }

    declare type Values<W extends Wrapper> = W[keyof W];

    declare type Version = 'V1' | 'V2' | 'V3' | 'V4';

    declare interface VersionConfig {
        properties: {
            version: {
                type: string;
                serializedType: string;
                serializedName: "Version";
            };
            apiVersion: {
                type: number;
                serializedType: number;
                serializedName: "APIVersion";
            };
            blockDelay: {
                type: bigint;
                serializedType: string;
                serializedName: "BlockDelay";
            };
        };
    }

    /**
     * Execution engine which can be used to run a blockchain, individual
     * blocks, individual transactions, or snippets of EVM bytecode.
     *
     * This class is an AsyncEventEmitter, please consult the README to learn how to use it.
     */
    declare class VM {
        /**
         * The StateManager used by the VM
         */
        readonly stateManager: StateManager;
        /**
         * The blockchain the VM operates on
         */
        readonly blockchain: BlockchainInterface;
        readonly _common: Common;
        readonly events: AsyncEventEmitter<VMEvents>;
        /**
         * The EVM used for bytecode execution
         */
        readonly evm: EVMInterface;
        readonly eei: EEIInterface;
        protected readonly _opts: VMOpts;
        protected _isInitialized: boolean;
        protected readonly _hardforkByBlockNumber: boolean;
        protected readonly _hardforkByTTD?: bigint;
        /**
         * Cached emit() function, not for public usage
         * set to public due to implementation internals
         * @hidden
         */
        readonly _emit: (topic: string, data: any) => Promise<void>;
        /**
         * VM is run in DEBUG mode (default: false)
         * Taken from DEBUG environment variable
         *
         * Safeguards on debug() calls are added for
         * performance reasons to avoid string literal evaluation
         * @hidden
         */
        readonly DEBUG: boolean;
        /**
         * VM async constructor. Creates engine instance and initializes it.
         *
         * @param opts VM engine constructor options
         */
        static create(opts?: VMOpts): Promise<VM>;
        /**
         * Instantiates a new {@link VM} Object.
         *
         * @deprecated The direct usage of this constructor is discouraged since
         * non-finalized async initialization might lead to side effects. Please
         * use the async {@link VM.create} constructor instead (same API).
         * @param opts
         */
        protected constructor(opts?: VMOpts);
        init(): Promise<void>;
        /**
         * Processes the `block` running all of the transactions it contains and updating the miner's account
         *
         * This method modifies the state. If `generate` is `true`, the state modifications will be
         * reverted if an exception is raised. If it's `false`, it won't revert if the block's header is
         * invalid. If an error is thrown from an event handler, the state may or may not be reverted.
         *
         * @param {RunBlockOpts} opts - Default values for options:
         *  - `generate`: false
         */
        runBlock(opts: RunBlockOpts): Promise<RunBlockResult>;
        /**
         * Process a transaction. Run the vm. Transfers eth. Checks balances.
         *
         * This method modifies the state. If an error is thrown, the modifications are reverted, except
         * when the error is thrown from an event handler. In the latter case the state may or may not be
         * reverted.
         *
         * @param {RunTxOpts} opts
         */
        runTx(opts: RunTxOpts): Promise<RunTxResult>;
        /**
         * Build a block on top of the current state
         * by adding one transaction at a time.
         *
         * Creates a checkpoint on the StateManager and modifies the state
         * as transactions are run. The checkpoint is committed on {@link BlockBuilder.build}
         * or discarded with {@link BlockBuilder.revert}.
         *
         * @param {BuildBlockOpts} opts
         * @returns An instance of {@link BlockBuilder} with methods:
         * - {@link BlockBuilder.addTransaction}
         * - {@link BlockBuilder.build}
         * - {@link BlockBuilder.revert}
         */
        buildBlock(opts: BuildBlockOpts): Promise<BlockBuilder>;
        /**
         * Returns a copy of the {@link VM} instance.
         */
        copy(): Promise<VM>;
        /**
         * Return a compact error string representation of the object
         */
        errorStr(): string;
    }

    /**
     * Prefix for a single VM Exception occurring when running a transaction or block
     */
    declare const VM_EXCEPTION = "VM Exception while processing transaction: ";

    /**
     * Prefix for multiple VM Exceptions occurring when running transactions or a block
     */
    declare const VM_EXCEPTIONS = "Multiple VM Exceptions while processing transactions: : \n\n";

    declare type VmAfterTransactionEvent = {
        readonly context: EvmStepContext;
    };

    declare type VmBeforeTransactionEvent = {
        readonly context: EvmStepContext;
    };

    declare type VmConsoleLogEvent = {
        readonly context: EvmStepContext;
        readonly logs: ConsoleLogs;
    };

    declare type VMEvents = {
        beforeBlock: (data: Block_3, resolve?: (result?: any) => void) => void;
        afterBlock: (data: AfterBlockEvent, resolve?: (result?: any) => void) => void;
        beforeTx: (data: TypedTransaction_2, resolve?: (result?: any) => void) => void;
        afterTx: (data: AfterTxEvent, resolve?: (result?: any) => void) => void;
    };

    /**
     * Options for instantiating a {@link VM}.
     */
    declare interface VMOpts {
        /**
         * Use a {@link Common} instance
         * if you want to change the chain setup.
         *
         * ### Possible Values
         *
         * - `chain`: all chains supported by `Common` or a custom chain
         * - `hardfork`: `mainnet` hardforks up to the `Merge` hardfork
         * - `eips`: `2537` (usage e.g. `eips: [ 2537, ]`)
         *
         * Note: check the associated `@ethereumjs/evm` instance options
         * documentation for supported EIPs.
         *
         * ### Default Setup
         *
         * Default setup if no `Common` instance is provided:
         *
         * - `chain`: `mainnet`
         * - `hardfork`: `merge`
         * - `eips`: `[]`
         */
        common?: Common;
        /**
         * A {@link StateManager} instance to use as the state store
         */
        stateManager?: StateManager;
        /**
         * A {@link Blockchain} object for storing/retrieving blocks
         */
        blockchain?: BlockchainInterface;
        /**
         * If true, create entries in the state tree for the precompiled contracts, saving some gas the
         * first time each of them is called.
         *
         * If this parameter is false, each call to each of them has to pay an extra 25000 gas
         * for creating the account. If the account is still empty after this call, it will be deleted,
         * such that this extra cost has to be paid again.
         *
         * Setting this to true has the effect of precompiled contracts' gas costs matching mainnet's from
         * the very first call, which is intended for testing networks.
         *
         * Default: `false`
         */
        activatePrecompiles?: boolean;
        /**
         * If true, the state of the VM will add the genesis state given by {@link Blockchain.genesisState} to a newly
         * created state manager instance. Note that if stateManager option is also passed as argument
         * this flag won't have any effect.
         *
         * Default: `false`
         */
        activateGenesisState?: boolean;
        /**
         * Select hardfork based upon block number. This automatically switches to the right hard fork based upon the block number.
         *
         * Default: `false`
         */
        hardforkByBlockNumber?: boolean;
        /**
         * Select the HF by total difficulty (Merge HF)
         *
         * This option is a superset of `hardforkByBlockNumber` (so only use one of both options)
         * and determines the HF by both the block number and the TD.
         *
         * Since the TD is only a threshold the block number will in doubt take precedence (imagine
         * e.g. both Merge and Shanghai HF blocks set and the block number from the block provided
         * pointing to a Shanghai block: this will lead to set the HF as Shanghai and not the Merge).
         */
        hardforkByTTD?: BigIntLike;
        /**
         * Use a custom EEI for the EVM. If this is not present, use the default EEI.
         */
        eei?: EEIInterface;
        /**
         * Use a custom EVM to run Messages on. If this is not present, use the default EVM.
         */
        evm?: EVMInterface;
    }

    declare type VmStepData = ReturnType<typeof normalizeEvent>;

    declare type VmStepEvent = {
        readonly context: EvmStepContext;
        readonly data: VmStepData;
    };

    declare type VmTransaction = {
        nonce: bigint;
        gasPrice?: bigint;
        gasLimit: bigint;
        maxPriorityFeePerGas?: never;
        maxFeePerGas?: never;
        to: Address_2;
        value: bigint;
        data: Buffer;
        getSenderAddress: () => Address_2;
        getBaseFee: () => bigint;
        getUpfrontCost: () => bigint;
    } | {
        nonce: bigint;
        gasPrice?: never;
        gasLimit: bigint;
        maxPriorityFeePerGas?: bigint;
        maxFeePerGas?: bigint;
        to: Address_2;
        value: bigint;
        data: Buffer;
        getSenderAddress: () => Address_2;
        getBaseFee: () => bigint;
        getUpfrontCost: () => bigint;
    };

    /**
     * WalkController is an interface to control how the trie is being traversed.
     */
    declare class WalkController {
        readonly onNode: FoundNodeFunction;
        readonly taskExecutor: PrioritizedTaskExecutor;
        readonly trie: Trie;
        private resolve;
        private reject;
        /**
         * Creates a new WalkController
         * @param onNode - The `FoundNodeFunction` to call if a node is found.
         * @param trie - The `Trie` to walk on.
         * @param poolSize - The size of the task queue.
         */
        private constructor();
        /**
         * Async function to create and start a new walk over a trie.
         * @param onNode - The `FoundNodeFunction to call if a node is found.
         * @param trie - The trie to walk on.
         * @param root - The root key to walk on.
         * @param poolSize - Task execution pool size to prevent OOM errors. Defaults to 500.
         */
        static newWalk(onNode: FoundNodeFunction, trie: Trie, root: Buffer, poolSize?: number): Promise<void>;
        private startWalk;
        /**
         * Run all children of a node. Priority of these nodes are the key length of the children.
         * @param node - Node to get all children of and call onNode on.
         * @param key - The current `key` which would yield the `node` when trying to get this node with a `get` operation.
         */
        allChildren(node: TrieNode, key?: Nibbles): void;
        /**
         * Push a node to the queue. If the queue has places left for tasks, the node is executed immediately, otherwise it is queued.
         * @param nodeRef - Push a node reference to the event queue. This reference is a 32-byte keccak hash of the value corresponding to the `key`.
         * @param key - The current key.
         * @param priority - Optional priority, defaults to key length
         */
        pushNodeToQueue(nodeRef: Buffer, key?: Nibbles, priority?: number): void;
        /**
         * Push a branch of a certain BranchNode to the event queue.
         * @param node - The node to select a branch on. Should be a BranchNode.
         * @param key - The current key which leads to the corresponding node.
         * @param childIndex - The child index to add to the event queue.
         * @param priority - Optional priority of the event, defaults to the total key length.
         */
        onlyBranchIndex(node: BranchNode, key: Nibbles | undefined, childIndex: number, priority?: number): void;
        private processNode;
    }

    declare class Wallet {
        #private;
        readonly addresses: string[];
        readonly initialAccounts: Account[];
        readonly knownAccounts: Set<string>;
        readonly keyFiles: Map<string, MaybeEncrypted>;
        readonly unlockedAccounts: Map<string, Data>;
        readonly lockTimers: Map<string, NodeJS.Timeout>;
        constructor(opts: EthereumInternalOptions["wallet"], logging: EthereumInternalOptions["logging"]);
        encrypt(privateKey: Data, passphrase: string): Promise<{
            crypto: {
                cipher: string;
                ciphertext: Data;
                cipherparams: {
                    iv: Data;
                };
                kdf: string;
                kdfParams: {
                    salt: Data;
                    dklen: 32;
                    n: 1024;
                    p: 8;
                    r: 1;
                };
                mac: Data;
            };
            id: string;
            version: number;
        }>;
        /**
         * Syncronous version of the `encrypt` function.
         * @param privateKey -
         * @param passphrase -
         */
        encryptSync(privateKey: Data, passphrase: string): {
            crypto: {
                cipher: string;
                ciphertext: Data;
                cipherparams: {
                    iv: Data;
                };
                kdf: string;
                kdfParams: {
                    salt: Data;
                    dklen: 32;
                    n: 1024;
                    p: 8;
                    r: 1;
                };
                mac: Data;
            };
            id: string;
            version: number;
        };
        finishEncryption(derivedKey: Buffer, privateKey: Data, salt: Buffer, iv: Buffer, uuid: Buffer): {
            crypto: {
                cipher: string;
                ciphertext: Data;
                cipherparams: {
                    iv: Data;
                };
                kdf: string;
                kdfParams: {
                    salt: Data;
                    dklen: 32;
                    n: 1024;
                    p: 8;
                    r: 1;
                };
                mac: Data;
            };
            id: string;
            version: number;
        };
        decrypt(keyfile: EncryptType, passphrase: crypto.BinaryLike): Promise<Buffer>;
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
        addToKeyFile(address: Address, privateKey: Data, passphrase: string, lock: boolean): Promise<void>;
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
        addToKeyFileSync(address: Address, privateKey: Data, passphrase: string, lock: boolean): void;
        /**
         * Fetches the private key for a specific address. If the keyFile is encrypted
         * for the address, the passphrase is used to decrypt.
         * @param address - The address whose private key is to be fetched.
         * @param passphrase - The passphrase used to decrypt the private key.
         */
        getFromKeyFile(address: Address, passphrase: string): Promise<Buffer>;
        static createAccount(balance: Quantity, privateKey: Data, address: Address): Account;
        static createAccountFromPrivateKey(privateKey: Data): Account;
        createRandomAccount(): Account;
        unlockAccount(address: Address, passphrase: string, duration: number): Promise<boolean>;
        addUnknownAccount(address: Address, passphrase: string): Promise<boolean>;
        removeKnownAccount(address: Address, passphrase: string): Promise<boolean>;
        createFakePrivateKey(address: string): Data;
        lockAccount(lowerAddress: string): boolean;
    }

    declare type WalletConfig = {
        options: {
            /**
             * Number of accounts to generate at startup.
             *
             * @defaultValue 10
             */
            totalAccounts: {
                type: number;
                hasDefault: true;
                legacy: {
                    /**
                     * @deprecated Use wallet.totalAccounts instead
                     */
                    total_accounts: number;
                };
            };
            /**
             * Array of Accounts. Each object should have a balance key with a hexadecimal
             * value. The key secretKey can also be specified, which represents the
             * account's private key. If no secretKey, the address is auto-generated with
             * the given balance. If specified, the key is used to determine the account's
             * address.
             */
            accounts: {
                type: OptionsAccount[];
                legacy: {
                    /**
                     * @deprecated Use wallet.accounts instead
                     */
                    accounts: OptionsAccount[];
                };
                cliType: string[];
            };
            /**
             * Use pre-defined, deterministic seed.
             */
            deterministic: {
                type: boolean;
                hasDefault: true;
            };
            /**
             * Seed to use to generate a mnemonic.
             */
            seed: {
                type: string;
                hasDefault: true;
                legacy: {
                    /**
                     * @deprecated Use wallet.seed instead
                     */
                    seed: string;
                };
            };
            /**
             * Use a specific HD wallet mnemonic to generate initial addresses.
             */
            mnemonic: {
                type: string;
                hasDefault: true;
                legacy: {
                    /**
                     * @deprecated Use wallet.mnemonic instead
                     */
                    mnemonic: string;
                };
            };
            /**
             * Array of addresses or address indexes specifying which accounts should be unlocked.
             */
            unlockedAccounts: {
                type: Array<string | number>;
                legacy: {
                    /**
                     * @deprecated Use wallet.unlockedAccounts instead
                     */
                    unlocked_accounts: Array<string | number>;
                };
                cliType: string[];
            };
            /**
             * Lock available accounts by default (good for third party transaction signing).
             *
             * @defaultValue false
             */
            lock: {
                type: boolean;
                hasDefault: true;
                legacy: {
                    /**
                     * @deprecated Use wallet.lock instead
                     */
                    secure: boolean;
                };
            };
            /**
             * Passphrase to use when locking accounts.
             *
             * @defaultValue ""
             */
            passphrase: {
                type: string;
                hasDefault: true;
            };
            /**
             * Specifies a file to save accounts and private keys to, for testing.
             *
             * Can be a filename or file descriptor.
             *
             * If specifying a filename, the directory path must already exist.
             *
             * See: https://nodejs.org/api/fs.html#fs_fs_writefilesync_file_data_options
             */
            accountKeysPath: {
                type: string | number;
                legacy: {
                    /**
                     * @deprecated Use wallet.accountKeysPath instead
                     */
                    account_keys_path: string | number;
                };
            };
            /**
             * The default account balance, specified in ether.
             *
             * @defaultValue 1000 // ether
             */
            defaultBalance: {
                type: number;
                hasDefault: true;
                legacy: {
                    /**
                     * @deprecated Use wallet.defaultBalance instead
                     */
                    default_balance_ether: number;
                };
            };
            /**
             * The hierarchical deterministic path to use when generating accounts.
             *
             * @defaultValue "m/44'/60'/0'/0/"
             */
            hdPath: {
                type: string[];
                rawType: string;
                hasDefault: true;
                legacy: {
                    /**
                     * @deprecated Use wallet.hdPath instead
                     */
                    hd_path: string;
                };
            };
        };
        exclusiveGroups: [
        [
        "accounts",
        "totalAccounts"
        ],
        [
        "deterministic",
        "mnemonic",
        "seed"
        ]
        ];
    };

    declare type WalletConfig_2 = {
        options: {
            /**
             * Number of accounts to generate at startup.
             *
             * @defaultValue 10
             */
            totalAccounts: {
                type: number;
                hasDefault: true;
            };
            /**
             * Use pre-defined, deterministic seed.
             */
            deterministic: {
                type: boolean;
                hasDefault: true;
            };
            /**
             * Seed to use to generate a mnemonic.
             */
            seed: {
                type: string;
                hasDefault: true;
            };
            /**
             * The default account balance, specified in FIL.
             *
             * @defaultValue 100 // FIL
             */
            defaultBalance: {
                type: number;
                hasDefault: true;
            };
        };
        exclusiveGroups: [["deterministic", "seed"]];
    };

    /** A WebSocket connection that is valid from open to close event.
     * Read more about this in the user manual.
     */
    declare interface WebSocket {
        /** Sends a message. Returns 1 for success, 2 for dropped due to backpressure limit, and 0 for built up backpressure that will drain over time. You can check backpressure before or after sending by calling getBufferedAmount(). 
         *
         * Make sure you properly understand the concept of backpressure. Check the backpressure example file.
         */
        send(message: RecognizedString, isBinary?: boolean, compress?: boolean) : number;

        sendFirstFragment(message: RecognizedString, isBinary?: boolean, compress?: boolean) : boolean;
        sendFragment(message: RecognizedString, compress?: boolean) : boolean;
        sendLastFragment(message: RecognizedString, compress?: boolean) : boolean;

        /** Returns the bytes buffered in backpressure. This is similar to the bufferedAmount property in the browser counterpart.
         * Check backpressure example.
         */
        getBufferedAmount() : number;

        /** Gracefully closes this WebSocket. Immediately calls the close handler.
         * A WebSocket close message is sent with code and shortMessage.
         */
        end(code?: number, shortMessage?: RecognizedString) : void;

        /** Forcefully closes this WebSocket. Immediately calls the close handler.
         * No WebSocket close message is sent.
         */
        close() : void;

        /** Sends a ping control message. Returns sendStatus similar to WebSocket.send (regarding backpressure). This helper function correlates to WebSocket::send(message, uWS::OpCode::PING, ...) in C++. */
        ping(message?: RecognizedString) : number;

        /** Subscribe to a topic. */
        subscribe(topic: RecognizedString) : boolean;

        /** Unsubscribe from a topic. Returns true on success, if the WebSocket was subscribed. */
        unsubscribe(topic: RecognizedString) : boolean;

        /** Returns whether this websocket is subscribed to topic. */
        isSubscribed(topic: RecognizedString) : boolean;

        /** Returns a list of topics this websocket is subscribed to. */
        getTopics() : string[];

        /** Publish a message under topic. Backpressure is managed according to maxBackpressure, closeOnBackpressureLimit settings.
         * Order is guaranteed since v20.
         */
        publish(topic: RecognizedString, message: RecognizedString, isBinary?: boolean, compress?: boolean) : boolean;

        /** See HttpResponse.cork. Takes a function in which the socket is corked (packing many sends into one single syscall/SSL block) */
        cork(cb: () => void) : WebSocket;

        /** Returns the remote IP address. Note that the returned IP is binary, not text.
         *
         * IPv4 is 4 byte long and can be converted to text by printing every byte as a digit between 0 and 255.
         * IPv6 is 16 byte long and can be converted to text in similar ways, but you typically print digits in HEX.
         *
         * See getRemoteAddressAsText() for a text version.
         */
        getRemoteAddress() : ArrayBuffer;

        /** Returns the remote IP address as text. See RecognizedString. */
        getRemoteAddressAsText() : ArrayBuffer;

        /** Arbitrary user data may be attached to this object. In C++ this is done by using getUserData(). */
        [key: string]: any;
    }

    declare type WhisperPostObject = any;

    declare interface Wrapper {
        [propertyName: string]: {
            [serializedPropertyName: string]: any;
        };
    }

    declare type Writeable<T> = {
        -readonly [P in keyof T]: T[P];
    };

    declare class WriteError extends LevelUPError {}

    export { }
