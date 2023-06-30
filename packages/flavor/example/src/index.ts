import NotABlockchainChainFlavor from "./flavor";

/**
 * Exporting your Provider type directly can be useful to end users when using
 * your plugin programmatically:
 *
 * ```
 * import NotABlockchainChainFlavor, { Provider } from "not-a-blockchain-chain";
 * const provider: Provider = Ganache.provider({ flavor: "not-a-blockchain-chain" });`
 * ```
 */
export type { Provider } from "./provider";

/**
 * Exporting your Options type directly can be useful to end users when using
 * your plugin programmatically:
 *
 * ```
 * import NotABlockchainChainFlavor, { Options } from "not-a-blockchain-chain";
 * const options: Options = { ... };
 * const provider = Ganache.provider({ flavor: "not-a-blockchain-chain" });`
 * ```
 */
export type { NotABlockchainChainProviderOptions as Options } from "./options";

export default NotABlockchainChainFlavor;
