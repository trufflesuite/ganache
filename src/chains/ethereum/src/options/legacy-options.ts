// import { Base } from "@ganache/options";
// import { OptionRawType, OptionName } from "@ganache/options";
// import { ChainConfig } from "./chain-options";
// import { DatabaseConfig } from "./database-options";
// import { LoggingConfig } from "./logging-options";
// import { MinerConfig } from "./miner-options";
// import { WalletConfig } from "./wallet-options";

// type MakeLegacyOptions<C extends Base.Config> = {
//   [
//     K in OptionName<C> as void extends C["options"][K]["legacyName"] ? K : C["options"][K]["legacyName"]
//   ]:
//   OptionRawType<C, K>
// };

// /**
//  * @deprecated
//  */
// export type LegacyOptions = Partial<
//   MakeLegacyOptions<ChainConfig> &
//   MakeLegacyOptions<DatabaseConfig> &
//   MakeLegacyOptions<LoggingConfig> &
//   MakeLegacyOptions<MinerConfig> &
//   MakeLegacyOptions<WalletConfig>
// >;
