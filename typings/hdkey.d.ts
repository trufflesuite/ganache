declare module "hdkey" {
  type HDKeyJSON = {
    xpriv: string
    xpub: string
  };
  type HDKeyVersions = {private: number, public: number};
  export default class HDKey {
    public versions: HDKeyVersions;
    public depth: number;
    public index: number;
    readonly public parentFingerprint: number;
    readonly public fingerprint: number;
    readonly public identifier?: Uint8Array;
    readonly public pubKeyHash?: Uint8Array;
    readonly public privateKey?: Buffer;
    public publicKey?: Uint8Array;
    readonly public privateExtendedKey?: string;
    readonly public publicExtendedKey: string;
    readonly public chainCode?: Buffer;
    public derive: (path: string) => HDKey;
    public deriveChild: (index: number) => HDKey;
    public sign: (hash: Buffer) => Buffer;
    public verify: (hash: Buffer, signature: Buffer) => boolean;
    public wipePrivateData: () => HDKey;
    public toJSON: (path: string) => HDKeyJSON;
    static public fromMasterSeed: (seedBuffer: Buffer, version?: HDKeyVersions) => HDKey;
    static public fromExtendedKey: (base58key: string, version?: HDKeyVersions) => HDKey;
    static public fromJSON: (obj: HDKeyJSON) => HDKey;
    static public HARDENED_OFFSET: 0x80000000;
  }
}