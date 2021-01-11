import yargs from "yargs";
import { DefaultFlavor, DefaultOptionsByName } from "@ganache/flavors";
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
    args = args.command(
      commandAliases,
      `Use the ${flavor} flavor of Ganache`,
      flavorArgs => {
        const categories = Object.keys(flavorDefaults);

        for (const category of categories) {
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

              flavorArgs = flavorArgs.option(`${category}.${option}`, {
                group,
                description,
                alias,
                default: defaultValue,
                defaultDescription: (optionObj as any).defaultDescription,
                type: optionObj.cliType,
                choices: optionObj.cliChoices,
                coerce: optionObj.normalize
              });
            }
          }
        }
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

  // return yargs
  //   .strict()
  //   .check(argv => {
  //     if (argv.p < 1 || argv.p > 65535) {
  //       throw new Error(`Invalid port number '${argv.p}'`);
  //     }

  //     if (argv.h.trim() == "") {
  //       throw new Error(
  //         "Cannot leave hostname blank; please provide a hostname"
  //       );
  //     }

  //     return true;
  //   });
}
