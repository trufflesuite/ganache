import type EthereumFlavor from "@ganache/ethereum";
import type { AnyFlavor, ServerConfig } from "@ganache/flavor";
import { ExternalConfig, InternalOptions } from "@ganache/options";

type NamespacedServerConfigOptions = {
  server: ServerConfig;
};

export type ProviderOptions<F extends AnyFlavor> =
  (F["flavor"] extends "ethereum"
    ? {
        flavor?: F["flavor"];
      }
    : {
        flavor: F["flavor"];
      }) &
    Parameters<F["options"]["provider"]["normalize"]>[0];

/**
 * The server options include the default server optoins, the flavor's server
 * options, and ProviderOptions<F>
 */
export type ServerOptions<F extends AnyFlavor = EthereumFlavor> = Partial<{
  [K in keyof NamespacedServerConfigOptions]: ExternalConfig<
    NamespacedServerConfigOptions[K]
  >;
}> &
  ProviderOptions<F> &
  Parameters<F["options"]["server"]["normalize"]>[0];

export type InternalServerOptions =
  InternalOptions<NamespacedServerConfigOptions>;
