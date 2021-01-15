import yargs from "yargs";
import {
  DefaultFlavor,
  DefaultOptionsByName,
  EthereumFlavorName
} from "@ganache/flavors";
import { Definitions } from "@ganache/options";

const COLORS = {
  Bold: "\x1b[1m",
  Reset: "\x1b[0m",
  FgRed: "\x1b[31m",
  FgYellow: "\x1b[33m"
};

export default function (version: string, isDocker: boolean) {
  let args = yargs.strict();

  for (const [flavor, flavorDefaults] of Object.entries(DefaultOptionsByName)) {
    const commandAliases = flavor === DefaultFlavor ? ["$0", flavor] : flavor;
    let defaultPort: number;
    switch (flavor) {
      case EthereumFlavorName:
      default: {
        defaultPort = 8545;
        break;
      }
    }

    args = args.command(
      commandAliases,
      `Use the ${flavor} flavor of Ganache`,
      flavorArgs => {
        const categories = Object.keys(flavorDefaults);

        for (const category of categories) {
          flavorArgs = flavorArgs.option(category, {
            hidden: true
          });

          const group = `${category.charAt(0).toUpperCase()}${category.substr(
            1
          )}:`;
          const categoryObj = flavorDefaults[category] as Definitions<any>;
          const options = Object.keys(categoryObj);
          for (const option of options) {
            const optionObj = categoryObj[option];
            if (optionObj.disableInCLI !== true) {
              const useAliases = typeof optionObj.cliAliases !== "undefined";
              const alias = useAliases
                ? optionObj.cliAliases
                : (optionObj as any).legacyName;

              let description = optionObj.shortDescription;
              if (alias) {
                description = `${description}\n${COLORS.Bold}${
                  COLORS.FgYellow
                }Deprecated aliases: ${
                  Array.isArray(alias)
                    ? alias.filter(a => a.length > 1).join(", ")
                    : alias
                }${COLORS.Reset}\n`;
              }

              let defaultValue;
              try {
                const defaultGetter = (optionObj as any).default;
                if (defaultGetter && defaultGetter.length > 0) {
                  defaultValue = defaultGetter();
                }
              } catch (e) {}
              if (
                optionObj.cliType === "array" &&
                !Array.isArray(defaultValue)
              ) {
                // if we pass `default: undefined`, yargs will return `[ undefined ]`
                // this just explicitly fixes array types

                if (typeof defaultValue === "undefined") {
                  defaultValue = [];
                } else {
                  defaultValue = [defaultValue];
                }
              }

              flavorArgs = flavorArgs.option(`${category}.${option}`, {
                group,
                description,
                alias,
                default: defaultValue,
                defaultDescription: (optionObj as any).defaultDescription,
                type: optionObj.cliChoices ? undefined : optionObj.cliType,
                choices: optionObj.cliChoices,
                coerce: optionObj.normalize
              });
            }
          }
        }

        flavorArgs = flavorArgs
          .option("server", {
            hidden: true
          })
          .option("server.host", {
            group: "Server:",
            description: `Hostname to listen on.\n${COLORS.Bold}${COLORS.FgYellow}Deprecated aliases: host, hostname${COLORS.Reset}\n`,
            alias: ["h", "host", "hostname"],
            type: "string",
            default: isDocker ? "0.0.0.0" : "127.0.0.1"
          })
          .option("server.port", {
            group: "Server:",
            description: `Hostname to listen on.\n${COLORS.Bold}${COLORS.FgYellow}Deprecated aliases: port${COLORS.Reset}\n`,
            alias: ["p", "port"],
            type: "number",
            default: defaultPort
          })
          .check(argv => {
            const serverSettings = argv.server as any;
            if (serverSettings.port < 1 || serverSettings.port > 65535) {
              throw new Error(`Invalid port number '${serverSettings.port}'`);
            }

            if (serverSettings.host.trim() === "") {
              throw new Error(
                "Cannot leave hostname blank; please provide a hostname"
              );
            }

            return true;
          });
      }
    );
  }

  args = args
    .showHelpOnFail(false, "Specify -? or --help for available options")
    .help("help")
    .alias("help", "?")
    .wrap(Math.min(120, yargs.terminalWidth()))
    .version(version);

  return args;
}
