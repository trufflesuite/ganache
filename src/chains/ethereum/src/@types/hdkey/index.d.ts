declare module "hdkey" {
  type HDKeyJSON = {
    xpriv: string;
    xpub: string;
  };
  type HDKeyVersions = { private: number; public: number };
  export default class HDKey {
    public versions: HDKeyVersions;
    public depth: number;
    public index: number;
    public readonly parentFingerprint: number;
    public readonly fingerprint: number;
    public readonly identifier?: Uint8Array;
    public readonly pubKeyHash?: Uint8Array;
    public readonly privateKey?: Buffer;
    public publicKey?: Buffer;
    public readonly privateExtendedKey?: string;
    public readonly publicExtendedKey: string;
    public readonly chainCode?: Buffer;
    public derive: (path: string) => HDKey;
    public deriveChild: (index: number) => HDKey;
    public sign: (hash: Buffer) => Buffer;
    public verify: (hash: Buffer, signature: Buffer) => boolean;
    public wipePrivateData: () => HDKey;
    public toJSON: (path: string) => HDKeyJSON;
    public static fromMasterSeed: (
      seedBuffer: Buffer,
      version?: HDKeyVersions
    ) => HDKey;
    public static fromExtendedKey: (
      base58key: string,
      version?: HDKeyVersions
    ) => HDKey;
    public static fromJSON: (obj: HDKeyJSON) => HDKey;
    public static HARDENED_OFFSET: 0x80000000;
  }
}
