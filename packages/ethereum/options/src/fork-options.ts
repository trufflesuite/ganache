import { normalize } from "./helpers";
import { Definitions, UnionToTuple } from "@ganache/options";
import { Tag } from "@ganache/ethereum-utils";
import { URL } from "url";
const version = process.env.VERSION || "DEV";

// we aren't going to treat block numbers as a bigint, so we don't want to
// accept block numbers we can't add to
const MAX_BLOCK_NUMBER = Math.floor(Number.MAX_SAFE_INTEGER / 2);

type HeaderRecord = { name: string; value: string };
type ForkUrl = URL & { _blockNumber?: number | typeof Tag.latest };

type KnownNetworks = "mainnet" | "goerli" | "görli" | "sepolia";
export const KNOWN_NETWORKS = [
  "mainnet",
  "goerli",
  "görli",
  "sepolia"
] as UnionToTuple<KnownNetworks>;

export type ForkConfig = {
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
      // default is actually set within the Ethereum provider runtime
      // hasDefault: false;
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

const reColonSplit = /:\s?(?:.+)/;
function coerceHeaders(headers: HeaderRecord[], input: string) {
  // split *1* time on the first colon, this also ignores leading whitespace
  // from the value per RFC7230
  const [name, value] = input.split(reColonSplit);
  headers.push({ name, value });
  return headers;
}

const ALLOWED_PROTOCOLS = ["ws:", "wss:", "http:", "https:"];
const arrayToOxfordList = (
  arr: string[],
  conjunction: "and" | "or" = "and"
) => {
  const last = arr.pop();
  switch (arr.length) {
    case 0:
      return "";
    case 1:
      return last;
    case 2:
      return arr[0] + ` ${conjunction} ` + last;
    default:
      return arr.join(", ") + `, ${conjunction} ` + last;
  }
};
export const ForkOptions: Definitions<ForkConfig> = {
  // url's definition _must_ come before blockNumber, username, and password
  // as the defaults are processed in order, and they rely on the `fork.url`
  url: {
    normalize: rawInput => {
      // because `url` is an alias of `fork`, along with `provider` and
      // `network` the runtime type isn't always going to be `"string"`
      if (
        typeof rawInput !== "string" ||
        KNOWN_NETWORKS.includes(rawInput as any)
      ) {
        // if the string matches a network name ignore it
        return;
      }
      let url = new URL(rawInput) as ForkUrl;
      const path = url.pathname + url.search;
      const lastIndex = path.lastIndexOf("@");
      // pull the blockNumber out of the URL
      if (lastIndex !== -1) {
        // remove everything after the last @
        url = new URL(path.substr(0, lastIndex), url);
        const blockNumber = path.substr(lastIndex + 1);
        if (blockNumber && blockNumber !== Tag.latest) {
          // don't use parseInt because strings like `"123abc"` parse
          // to `123`, and there is probably an error on the user's side we'd
          // want to uncover.
          const asNum = (blockNumber as unknown as number) - 0;
          // don't allow invalid, negative, or decimals
          if (
            isNaN(asNum) ||
            asNum < 0 ||
            (asNum | 0) !== asNum ||
            asNum > MAX_BLOCK_NUMBER
          ) {
            console.warn(
              `Ignoring invalid block number in fork url: "${blockNumber}". Block number must be an integer from [0 - ${MAX_BLOCK_NUMBER}].`
            );
          } else {
            url._blockNumber = asNum;
          }
        }
        if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
          throw new Error(
            `Invalid protocol for fork url: ${
              url.protocol
            }. Supported protocols are: ${arrayToOxfordList(
              ALLOWED_PROTOCOLS
            )}.`
          );
        }
      }
      return url;
    },
    cliDescription: `Fork from another currently running Ethereum client at a given block. Input should be the URL of the node, e.g. \`"http://localhost:1337"\`. You can optionally specify the block to fork from using an @ sign: \`"http://localhost:1337@8675309"\`.

You can specify Basic Authentication credentials in the URL as well. e.g., \`"wss://user:password@example.com/"\`. If you need to use an Infura Project Secret, you would use it like this: \`"wss://:{YOUR-PROJECT-SECRET}@mainnet.infura.com/..."\`

Alternatively, you can use the \`fork.username\` and \`fork.password\` options.`,
    legacyName: "fork",
    cliAliases: ["f", "fork"],
    conflicts: ["provider", "network"]
  },
  provider: {
    normalize: rawInput => {
      // because `provider` is an alias of `fork`, along with `network` and
      // `url` the runtime type isn't always going to match the TypeScript type.
      // if rawInput is a string it will be handled by the `url` or `network`
      // handlers.
      if (
        typeof rawInput === "string" || // like `--fork http://url` (url shorthand)
        (typeof rawInput === "object" &&
          (typeof (rawInput as any).url === "string" || // like `--fork.url http://url`
            typeof (rawInput as any).url === "boolean" || // like `--fork` (implied "mainnet" network shorthand)
            typeof (rawInput as any).network === "string" || // like `--fork.network mainnet`
            typeof (rawInput as any).network === "boolean")) // like `--fork.network true`
      ) {
        return;
      } else {
        return rawInput;
      }
    },
    cliDescription: "Specify an EIP-1193 provider to use instead of a url.",
    disableInCLI: true,
    legacyName: "fork",
    conflicts: ["url", "network"]
  },
  network: {
    normalize: rawInput => {
      // because `network` is an alias of `fork`, along with `provider` and
      // `url` the runtime type isn't always going to be `"string"`
      if (typeof rawInput === "string" && KNOWN_NETWORKS.includes(rawInput))
        return rawInput;
      if (
        // handle `ganache --fork` case, which gets weird because both url
        // and network can use the `--fork` flag (the `url` handler ignores
        // non-strings, like `true` and strings that match our known networks)
        typeof rawInput === "object" &&
        "url" in (rawInput as any)
      ) {
        const { url } = rawInput as any;
        if (url === true) {
          return "mainnet";
        } else if (KNOWN_NETWORKS.includes(url)) {
          return (rawInput as any).url;
        }
      }
    },
    cliDescription: `A network name to fork from; uses Infura's archive nodes.

Use the shorthand command \`ganache --fork\` to automatically fork from Mainnet at the latest block.
`,
    cliChoices: KNOWN_NETWORKS,
    legacyName: "fork",
    conflicts: ["url", "provider"]
  },
  blockNumber: {
    normalize,
    cliDescription: "Block number the provider should fork from.",
    legacyName: "fork_block_number",
    default: ({ url, provider, network }) => {
      if (url) {
        // use the url's _blockNumber, if present, otherwise use "latest"
        if (url._blockNumber) {
          return url._blockNumber;
        } else {
          return Tag.latest;
        }
      } else if (provider || network) {
        return Tag.latest;
      } else {
        return;
      }
    },
    defaultDescription: `Latest block number`
    //implies: ["url"]
  },
  preLatestConfirmations: {
    normalize,
    cliDescription:
      'When the `fork.blockNumber` is set to "latest" (default), the number of blocks before the remote node\'s "latest" block to fork from.',
    default: () => 5,
    defaultDescription: "5",
    cliType: "number"
  },
  username: {
    normalize,
    cliDescription: `Username to use for Basic Authentication. Does not require setting \`fork.password\`.

When combined with \`fork.password\`, is shorthand for \`fork: { headers: { "Authorization": "Basic {ENCODED-BASIC-HEADER}" } }\`

If the \`fork.headers\` option specifies an "Authorization" header, it will be be inserted _after_ this Basic token.`,
    default: ({ url }) => {
      // use the url's username, if present
      if (url) {
        if (url.username) {
          return url.username;
        }
      }
    },
    defaultDescription: ""
    //implies: ["url"]
  },
  password: {
    normalize,
    cliDescription: `Password to use for Basic Authentication. Does not require setting \`fork.username\`.

When combined with \`fork.username\`, is shorthand for \`fork: { headers: { "Authorization": "Basic {ENCODED-BASIC-HEADER}" } }\`

If the \`fork.headers\` option specifies an "Authorization" header, it will be be inserted _after_ this Basic token.`,
    default: ({ url }) => {
      // use the url's password, if present
      if (url) {
        if (url.password) {
          return url.password;
        }
      }
    },
    defaultDescription: ""
    //implies: ["url"]
  },
  jwt: {
    normalize,
    cliDescription: `_Encoded_ JSON Web Token (JWT) used for authenticating to some servers.

Shorthand for \`fork: { headers: { "Authorization": "Bearer {YOUR-ENCODED-JWT}" } }\`

 If the \`fork.headers\` option specifies an "Authorization" header, it will be be inserted _after_ the JWT Bearer token.`
    //implies: ["url"]
  },
  userAgent: {
    normalize,
    cliDescription: `The User-Agent header sent to the fork on each request.

Sent as Api-User-Agent when used in the browser.

Will be overridden by a \`"User-Agent"\` defined in the \`fork.headers\` option, if provided.`,
    default: () => {
      return `Ganache/${version} (https://www.trufflesuite.com/ganache; ganache<at>trufflesuite.com)`;
    }
    // implies: ["url"]
  },
  origin: {
    normalize,
    cliDescription: `The Origin header sent to the fork on each request.

Ignored in the browser.

Will be overridden by an \`"Origin"\` value defined in the \`fork.headers\` option, if provided.`
    //implies: ["url"]
  },

  headers: {
    normalize,
    cliDescription: `Headers to supply on each request to the forked provider.

Headers set here override headers set by other options, unless otherwise specified.

Defaults to: \`["User-Agent: Ganache/VERSION (https://www.trufflesuite.com/ganache; ganache<at>trufflesuite.com)"]\``,
    cliType: "array:string",
    implies: ["url"],
    cliCoerce: rawInput => rawInput.reduce(coerceHeaders, [])
  },
  requestsPerSecond: {
    normalize(rawValue) {
      if (rawValue < 0) {
        throw new Error(
          `fork.requestsPerSecond is invalid: "${rawValue}"; must be a positive number`
        );
      }
      return rawValue;
    },
    default: () => 0,
    cliDescription:
      "Restrict the number of requests per second sent to the fork provider. `0` means no limit is applied.",
    cliType: "number"
    //implies: ["url"]
  },
  disableCache: {
    normalize,
    default: () => false,
    cliDescription: "Disables caching of all forking requests.",
    cliType: "boolean"
  },
  deleteCache: {
    normalize,
    default: () => false,
    cliDescription: "Deletes the persistent cache before starting.",
    cliType: "boolean"
  }
};
