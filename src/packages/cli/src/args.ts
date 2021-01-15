import { TruffleColors } from "@ganache/colors";
import yargs from "yargs";
import { DefaultFlavor, DefaultOptionsByName } from "@ganache/flavors";
import {
  Base,
  Definitions,
  YargsPrimitiveCliTypeStrings
} from "@ganache/options";
import { Command, CliOptions, Yargs } from "./types";
import chalk from "chalk";
import { EOL } from "os";
import marked from "marked";
import TerminalRenderer from "marked-terminal";

marked.setOptions({
  renderer: new TerminalRenderer({
    codespan: chalk.hex(TruffleColors.porsche),
    // Disable `unescape` since doesn't work for everything (we just do it ourselves)
    unescape: false
  })
});

const wrapWidth = Math.min(120, yargs.terminalWidth());
const NEED_HELP = "Need more help? Reach out to the Truffle community at";
const COMMUNITY_LINK = "https://gitter.im/ConsenSys/truffle";

function unescapeEntities(html: string) {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
const highlight = (t: string) => unescapeEntities(marked.parseInline(t));
const center = (t: string) => " ".repeat((wrapWidth - t.length) >> 1) + t;

export default function (version: string, isDocker: boolean) {
  let args = yargs
    .strict()
    .usage(chalk`{hex("${TruffleColors.porsche}").bold ${center(version)}}`)
    .epilogue(
      chalk`{hex("${TruffleColors.porsche}").bold ${center(NEED_HELP)}}` +
        EOL +
        chalk`{hex("${TruffleColors.turquoise}") ${center(COMMUNITY_LINK)}}`
    );

  let flavor: keyof typeof DefaultOptionsByName;
  for (flavor in DefaultOptionsByName) {
    const flavorDefaults = DefaultOptionsByName[flavor];
    let command: Command;
    let defaultPort: number;
    switch (flavor) {
      // since "ethereum" is the DefaultFlavor we don't need a `case` for it
      case DefaultFlavor:
        command = ["$0", flavor];
        defaultPort = 8545;
        break;
      default:
        command = flavor;
        defaultPort = 8545;
    }

    args = args.command(
      command,
      chalk`Use the {bold ${flavor}} flavor of Ganache`,
      flavorArgs => {
        let category: keyof typeof flavorDefaults;
        for (category in flavorDefaults) {
          flavorArgs = flavorArgs.option(category, {
            hidden: true
          });

          type GroupType = `${Capitalize<typeof category>}:`;
          const group = `${category[0].toUpperCase()}${category.slice(
            1
          )}:` as GroupType;
          const categoryObj = (flavorDefaults[
            category
          ] as unknown) as Definitions<Base.Config>;
          const state = {};
          for (const option in categoryObj) {
            const optionObj = categoryObj[option];
            if (optionObj.disableInCLI !== true) {
              let alias = optionObj.cliAliases;

              let description = highlight(optionObj.cliDescription || "");
              if (alias) {
                description = chalk`${description}${EOL}{dim deprecated aliases: ${alias
                  .filter(a => a.length > 1)
                  .map(a => `--${a}`)
                  .join(", ")}}`;
              } else {
                alias = [];
              }

              const generateDefaultDescription = () => {
                // default sometimes requires a config, so we set supply one
                return (state[option] = optionObj.default
                  ? optionObj.default(state).toString()
                  : undefined);
              };
              const defaultDescription =
                optionObj.defaultDescription || generateDefaultDescription();

              // we need to specify the type of each array so yargs properly casts
              // the types held within each array
              const { cliType } = optionObj;
              const array = cliType.startsWith("array:"); // e.g. array:string or array:number
              const type = (array
                ? cliType.slice(6) // remove the "array:" part
                : cliType) as YargsPrimitiveCliTypeStrings;

              const options = {
                group,
                description,
                alias: alias.filter(a => a.length === 1),
                defaultDescription,
                array,
                type,
                choices: optionObj.cliChoices
              };
              flavorArgs = flavorArgs.option(`${category}.${option}`, options);
              const aliasOptions = { hidden: true, ...options };
              aliasOptions.alias = [`${category}.${option}`];
              alias.forEach(a => {
                if (a.length === 1) return;
                flavorArgs = flavorArgs.option(a, aliasOptions);
              });
            }
          }
        }

        // TODO: combine these cli options with core's `ServerOptions`
        flavorArgs = flavorArgs
          .option("server", {
            hidden: true
          })
          .option("server.host", {
            group: "Server:",
            description: chalk`Hostname to listen on.${EOL}{dim Deprecated aliases: --host, --hostname}${EOL}`,
            alias: ["h", "host", "hostname"],
            type: "string",
            default: isDocker ? "0.0.0.0" : "127.0.0.1"
          })
          .option("server.port", {
            group: "Server:",
            description: chalk`Port to listen on.${EOL}{dim Deprecated aliases: --port}${EOL}`,
            alias: ["p", "port"],
            type: "number",
            default: defaultPort
          })
          .check(({ server }) => {
            const { port, host } = server as CliOptions;
            if (port < 1 || port > 65535) {
              throw new Error(`Invalid port number '${port}'`);
            }

            if (host.trim() === "") {
              throw new Error("Cannot leave host blank; please provide a host");
            }

            return true;
          });
      }
    );
  }

  args = args
    .showHelpOnFail(false, "Specify -? or --help for available options")
    .alias("help", "?")
    .wrap(wrapWidth)
    .version(version);

  return (args as unknown) as Yargs;
}
