import { OptionsConfig } from "@ganache/options";
import { CliConfig } from "./cli-config";
import { cliDefaults } from "./cli-defaults";

export type Options = {
  server: CliConfig;
};
export type CliOptionsConfig = OptionsConfig<Options>;
export const CliOptionsConfig = new OptionsConfig(cliDefaults);
