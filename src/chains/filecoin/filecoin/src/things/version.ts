import {
  SerializableObject,
  DeserializedObject,
  SerializedObject,
  Definitions
} from "./serializable-object";

const GanacheFilecoinVersion = process.env.GANACHE_FILECOIN_VERSION || "DEV";

// https://pkg.go.dev/github.com/filecoin-project/lotus@v1.4.0/api#Version

function createBinarySemverVersion(version: string): number {
  const versionParts = version.split(".");

  const majorVersion =
    versionParts.length > 0 ? parseInt(versionParts[0], 10) : 0;
  const minorVersion =
    versionParts.length > 1 ? parseInt(versionParts[1], 10) : 0;
  const patchVersion =
    versionParts.length > 2 ? parseInt(versionParts[2], 10) : 0;

  const binaryVersion =
    (majorVersion << 16) | (minorVersion << 8) | patchVersion;

  return binaryVersion;
}

interface VersionConfig {
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

class Version
  extends SerializableObject<VersionConfig>
  implements DeserializedObject<VersionConfig> {
  get config(): Definitions<VersionConfig> {
    return {
      version: {
        deserializedName: "version",
        serializedName: "Version",
        defaultValue: `@ganache/filecoin v${GanacheFilecoinVersion}`
      },
      apiVersion: {
        deserializedName: "apiVersion",
        serializedName: "APIVersion",
        // Version determined by what we're using for at https://pkg.go.dev/github.com/filecoin-project/lotus/api
        defaultValue: createBinarySemverVersion("1.4.0")
      },
      blockDelay: {
        deserializedName: "blockDelay",
        serializedName: "BlockDelay",
        defaultValue: literal => (literal ? BigInt(literal) : 0n)
      }
    };
  }

  constructor(
    options?:
      | Partial<SerializedObject<VersionConfig>>
      | Partial<DeserializedObject<VersionConfig>>
  ) {
    super();

    this.version = super.initializeValue(this.config.version, options);
    this.apiVersion = super.initializeValue(this.config.apiVersion, options);
    this.blockDelay = super.initializeValue(this.config.blockDelay, options);
  }

  version: string;
  apiVersion: number;
  blockDelay: bigint;
}

type SerializedVersion = SerializedObject<VersionConfig>;

export { Version, SerializedVersion };
