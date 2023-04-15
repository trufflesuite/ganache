import type { Flavor } from "@ganache/flavor";
import {
  cliDefaults,
  load,
  OptionsConfig,
  serverDefaults
} from "@ganache/flavor";
import chalk from "chalk";
import { Argv } from "yargs";
import { applyDefaults } from "./helpers";

export function loadFlavorFromArgs(args: string[]): Flavor {
  // the next entry after `--flavor` is treated as a flavor name, if it isn't a
  // valid npm package we'll throw an error via `load` or
  const flavorArgIndex = args.indexOf("--flavor") + 1;
  if (flavorArgIndex > 0) {
    const flavor = args[flavorArgIndex];
    if (flavor) {
      if (flavor !== "ethereum") {
        // load flavor plugin:
        return load(flavor === "filecoin" ? "@ganache/filecoin" : flavor);
      }
    } else {
      throw new Error("No flavor specified after `--flavor` flag.");
    }
  }

  // fallback to ethereum
  return require("@ganache/ethereum").default;
}

function addFlavorFlag(yargs: Argv<{}>) {
  // Usage: `ganache --flavor [string]`
  yargs.option("flavor", {
    type: "string",
    description: chalk`Load an installed npm package as a Ganache flavor, e.g., {bold ganache --flavor @ganache/filecoin}.`
  });
}

function addOptions(
  yargs: Argv<{}>,
  flavor: string,
  options: {
    provider?: OptionsConfig<any>;
    server?: OptionsConfig<any>;
    cli?: OptionsConfig<any>;
  }
) {
  // Usage: `ganache`
  // If the user has specified a --flavor, we use this command's `help` option
  // to show it.
  yargs.command(
    ["$0"],
    chalk`Use the {bold ${flavor}} flavor of Ganache`,
    args => {
      applyDefaults(cliDefaults, args);

      applyDefaults(serverDefaults, args);

      // flavorDefaults are applied after the default cli and server options
      // so that the flavor defaults can override them.
      if (options) {
        options.provider && applyDefaults(options.provider.defaults, args);
        options.server && applyDefaults(options.server.defaults, args);
        options.cli && applyDefaults(options.cli.defaults, args);
      }
    },
    parsed => (parsed.action = parsed.detach ? "start-detached" : "start")
  );
}

export function configureFlavorOptions(
  yargs: Argv<{}>,
  flavor: string,
  options: {
    provider?: OptionsConfig<any>;
    server?: OptionsConfig<any>;
    cli?: OptionsConfig<any>;
  }
) {
  addFlavorFlag(yargs);

  addOptions(yargs, flavor, options);
}
