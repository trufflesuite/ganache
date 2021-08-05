import { normalize } from "./helpers";
import { Definitions } from "@ganache/options";
import { $INLINE_JSON } from "ts-transformer-inline-file";
import { Tag } from "@ganache/ethereum-utils";
import { URL } from "url";
const { version } = $INLINE_JSON("../../../../packages/ganache/package.json");

// we aren't going to treat block numbers as a bigint, so we don't want to
// accept block numbers we can't add to
const MAX_BLOCK_NUMBER = Math.floor(Number.MAX_SAFE_INTEGER / 2);

type HeaderRecord = { name: string; value: string };
type ForkUrl = URL & { _blockNumber?: number | Tag.LATEST };

export type ForkConfig = {
  options: {
    /**
     * Fork from another currently running Ethereum client. Input should be the
     * URL of the node, e.g. http://localhost:8545. You can optionally specify
     * the block to fork from using an @ sign: http://localhost:8545@1599200
     *
     * You can specify Basic Authentication credentials in the URL as well. e.g.,
     * wss://user:password@example.com/. If you need to use an Infura Project
     * Secret, you would use it like this: wss://:{YOUR-PROJECT-SECRET}@mainnet.infura.com/...
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

    /**
     * Block number the provider should fork from.
     */
    blockNumber: {
      type: number | Tag.LATEST;
      hasDefault: true;
      legacy: {
        /**
         * @deprecated Use fork.blockNumber instead
         */
        fork_block_number: number | Tag.LATEST;
      };
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
     * @default "Ganache/VERSION (https://www.trufflesuite.com/ganache; ganache＠trufflesuite.com) ＠ganache/ethereum/VERSION"
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
     * @default
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
     * @default 0
     */
    requestsPerSecond: {
      type: number;
      hasDefault: true;
    };
  };
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
      if (typeof rawInput !== "string") return;
      let url = new URL(rawInput) as ForkUrl;
      const path = url.pathname + url.search;
      const lastIndex = path.lastIndexOf("@");
      // pull the blockNumber out of the URL
      if (lastIndex !== -1) {
        // remove everything after the last @
        url = new URL(path.substr(0, lastIndex), url);
        const blockNumber = path.substr(lastIndex + 1);
        if (blockNumber && blockNumber !== Tag.LATEST) {
          // don't use parseInt because strings like `"123abc"` parse
          // to `123`, and there is probably an error on the user's side we'd
          // want to uncover.
          const asNum = ((blockNumber as unknown) as number) - 0;
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
    cliAliases: ["f", "fork"]
  },
  provider: {
    normalize: rawInput => {
      // if rawInput is a string it will be handled by the `url` handler
      if (typeof rawInput === "string") return;
      return rawInput;
    },
    cliDescription: "Specify an EIP-1193 provider to use instead of a url.",
    disableInCLI: true,
    legacyName: "fork"
  },
  blockNumber: {
    normalize,
    cliDescription: "Block number the provider should fork from.",
    legacyName: "fork_block_number",
    default: ({ url, provider }) => {
      if (url) {
        // use the url's _blockNumber, if present, otherwise use "latest"
        if (url._blockNumber) {
          return url._blockNumber;
        } else {
          return Tag.LATEST;
        }
      } else if (provider) {
        return Tag.LATEST;
      } else {
        return;
      }
    },
    defaultDescription: `"${Tag.LATEST}"`
    //implies: ["url"]
  },
  username: {
    normalize,
    cliDescription: `* Username to use for Basic Authentication. Does not require setting \`fork.password\`.
    
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
  }
};
