import { Defaults } from "@ganache/options";
import { CliConfig } from "./cli-config";
import { CliOptions } from "./cli-options";

export type CliDefaults = Defaults<{
  server: CliConfig;
}>;
export const cliDefaults: CliDefaults = {
  server: CliOptions
};
