import MyChainFlavor from "./flavor";

/**
 * Exporting your Provider type directly can be useful to end users when using
 * your plugin programmatically:
 *
 * ```
 * import { MyChainFlavor, Provider } from "my-chain";
 * const provider: Provider = Ganache.provider({ flavor: "my-chain" });`
 * ```
 */
export type { Provider } from "./provider";

/**
 * Exporting your Options type directly can be useful to end users when using
 * your plugin programmatically:
 *
 * ```
 * import { MyChainFlavor, Options } from "my-chain";
 * const options: Options = { ... };
 * const provider = Ganache.provider({ flavor: "my-chain" });`
 * ```
 */
export type { MyChainProviderOptions as Options } from "./options";

export default MyChainFlavor;
