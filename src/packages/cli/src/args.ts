import { TruffleColors } from "@ganache/colors";
import yargs, { Options } from "yargs";
import {
  DefaultFlavor,
  FilecoinFlavorName,
  DefaultOptionsByName,
  FlavorName
} from "@ganache/flavors";
import {
  Base,
  Definitions,
  YargsPrimitiveCliTypeStrings
} from "@ganache/options";
import { FlavorCommand, StartArgs, GanacheArgs } from "./types";
import chalk from "chalk";
import { EOL } from "os";
import marked from "marked";
import TerminalRenderer from "marked-terminal";
import { _DefaultServerOptions } from "@ganache/core";

marked.setOptions({
  renderer: new TerminalRenderer({
    codespan: chalk.hex(TruffleColors.porsche),
    // Disable `unescape` since doesn't work for everything (we just do it ourselves)
    unescape: false
  })
});

const wrapWidth = Math.min(120, yargs.terminalWidth());
const NEED_HELP = "Need more help? Reach out to the Truffle community at";
const COMMUNITY_LINK = "https://trfl.io/support";
const OR_DOCS = "or check out our docs at";
const DOCS_LINK = "https://ganache.dev";

function unescapeEntities(html: string) {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\*\#COLON\|\*/g, ":");
}
const highlight = (t: string) => unescapeEntities(marked.parseInline(t));
const center = (str: string, length: number) =>
  " ".repeat(Math.max(0, Math.floor((wrapWidth - length) / 2))) + str;

const addAliases = (args: yargs.Argv<{}>, aliases: string[], key: string) => {
  const options = { hidden: true, alias: key };
  return aliases.reduce((args, a) => args.option(a, options), args);
};

function processOption(
  state: any,
  category: string,
  group: string,
  option: string,
  optionObj: Definitions<Base.Config>[string],
  argv: yargs.Argv,
  flavor: string
) {
  if (optionObj.disableInCLI !== true) {
    const shortHand = [];
    const legacyAliases = [];

    let description = highlight(optionObj.cliDescription || "");
    if (optionObj.cliAliases) {
      optionObj.cliAliases.forEach(alias => {
        if (alias.length === 1) shortHand.push(alias);
        else legacyAliases.push(alias);
      });
      description = chalk`${description}${EOL}{dim deprecated aliases: ${legacyAliases
        .map(a => `--${a}`)
        .join(", ")}}`;
    }

    const generateDefaultDescription = () => {
      // default sometimes requires a config, so we supply one
      return (state[option] = optionObj.default
        ? optionObj.default(state, flavor).toString()
        : undefined);
    };
    const defaultDescription =
      "defaultDescription" in optionObj
        ? optionObj.defaultDescription
        : generateDefaultDescription();

    // we need to specify the type of each array so yargs properly casts
    // the types held within each array
    const { cliType } = optionObj;
    const array = cliType && cliType.startsWith("array:"); // e.g. array:string or array:number
    const type = (
      array
        ? cliType.slice(6) // remove the "array:" part
        : cliType
    ) as YargsPrimitiveCliTypeStrings;

    const options: Options = {
      group,
      description,
      alias: shortHand,
      defaultDescription,
      array,
      type,
      choices: optionObj.cliChoices,
      coerce: optionObj.cliCoerce,
      implies: optionObj.implies
    };

    const key = `${category}.${option}`;

    // First, create *hidden* deprecated aliases...
    argv = addAliases(argv, legacyAliases, key);

    // and *then* create the main option, as options added later take precedence
    // example: `-d --wallet.seed 123` is invalid (mutally exclusive). If aliases are defined _after_
    // the main option definition the error message will be `Arguments deterministic and wallet.seed are mutually exclusive`
    // when it should be `Arguments wallet.deterministic and wallet.seed are mutually exclusive`
    argv = argv.option(key, options);
  }
}

function applyDefaults(
  flavorDefaults:
    | typeof DefaultOptionsByName[keyof typeof DefaultOptionsByName]
    | typeof _DefaultServerOptions,
  flavorArgs: yargs.Argv<{}>,
  flavor: keyof typeof DefaultOptionsByName
) {
  for (const category in flavorDefaults) {
    type GroupType = `${Capitalize<typeof category>}:`;
    const group = `${category[0].toUpperCase()}${category.slice(
      1
    )}:` as GroupType;
    const categoryObj = flavorDefaults[
      category
    ] as unknown as Definitions<Base.Config>;
    const state = {};
    for (const option in categoryObj) {
      const optionObj = categoryObj[option];
      processOption(
        state,
        category,
        group,
        option,
        optionObj,
        flavorArgs,
        flavor
      );
    }
  }
}

export default function (
  version: string,
  isDocker: boolean,
  rawArgs = process.argv.slice(2)
) {
  const versionUsageOutputText = chalk`{hex("${
    TruffleColors.porsche
  }").bold ${center(version, version.length)}}`;

  // disable dot-notation because yargs just can't coerce args properly...
  // ...on purpose! https://github.com/yargs/yargs/issues/1021#issuecomment-352324693
  yargs
    .parserConfiguration({ "dot-notation": false })
    .strict()
    .usage(versionUsageOutputText)
    .epilogue(
      versionUsageOutputText +
        EOL +
        EOL +
        center(
          chalk`{hex("${TruffleColors.porsche}").bold ${NEED_HELP}} {hex("${TruffleColors.turquoise}") ${COMMUNITY_LINK}}`,
          (NEED_HELP + " " + COMMUNITY_LINK).length
        ) +
        EOL +
        center(
          chalk`{hex("${TruffleColors.porsche}").bold ${OR_DOCS}} {hex("${TruffleColors.turquoise}") ${DOCS_LINK}}`,
          (OR_DOCS + " " + DOCS_LINK).length
        )
    );

  let flavor: keyof typeof DefaultOptionsByName;
  for (flavor in DefaultOptionsByName) {
    const flavorDefaults = DefaultOptionsByName[flavor];
    let command: FlavorCommand;
    let defaultPort: number;
    switch (flavor) {
      // since "ethereum" is the DefaultFlavor we don't need a `case` for it
      case FilecoinFlavorName:
        command = flavor;
        defaultPort = 7777;
        break;
      case DefaultFlavor:
        command = ["$0", flavor];
        defaultPort = 8545;
        break;
      default:
        command = flavor;
        defaultPort = 8545;
    }

    yargs.command(
      command,
      chalk`Use the {bold ${flavor}} flavor of Ganache`,
      flavorArgs => {
        applyDefaults(flavorDefaults, flavorArgs, flavor);

        applyDefaults(_DefaultServerOptions, flavorArgs, flavor);

        flavorArgs = flavorArgs
          .option("server.host", {
            group: "Server:",
            description: chalk`Hostname to listen on.${EOL}{dim deprecated aliases: --host, --hostname}${EOL}`,
            alias: ["h", "host", "hostname"],
            type: "string",
            default: isDocker ? "0.0.0.0" : "127.0.0.1"
          })
          .option("server.port", {
            group: "Server:",
            description: chalk`Port to listen on.${EOL}{dim deprecated aliases: --port}${EOL}`,
            alias: ["p", "port"],
            type: "number",
            default: defaultPort
          })
          .check(argv => {
            const { "server.port": port, "server.host": host } = argv;
            if (port < 0 || port > 65535) {
              throw new Error(`Invalid port number '${port}'`);
            }

            if (host.trim() === "") {
              throw new Error("Cannot leave host blank; please provide a host");
            }

            return true;
          })
          .option("detach", {
            description: highlight(
              "Run Ganache in detached (daemon) mode." +
                EOL +
                "See `ganache instances --help` for information on managing detached instances."
            ),
            type: "boolean",
            alias: ["D", "😈"]
          });
      },
      parsedArgs => {
        parsedArgs.action = parsedArgs.detach ? "start-detached" : "start";
      }
    );
  }

  yargs
    .command(
      "instances",
      highlight(
        "Manage instances of Ganache running in detached mode." +
          EOL +
          "(Ganache can be run in detached mode by providing the `--detach` flag)"
      ),
      _yargs => {
        _yargs
          .command(
            "list",
            "List instances running in detached mode",
            _ => {},
            listArgs => {
              listArgs.action = "list";
            }
          )
          .command(
            "stop <name>",
            "Stop the instance specified by <name>",
            stopArgs => {
              stopArgs.positional("name", { type: "string" });
            },
            stopArgs => {
              stopArgs.action = "stop";
            }
          )
          .version(false);
      }
    )
    .showHelpOnFail(false, "Specify -? or --help for available options")
    .alias("help", "?")
    .wrap(wrapWidth)
    .version(version);

  const parsedArgs = yargs.parse(rawArgs);

  let finalArgs: GanacheArgs;
  if (parsedArgs.action === "stop") {
    finalArgs = {
      action: "stop",
      name: parsedArgs.name as string
    };
  } else if (parsedArgs.action === "list") {
    finalArgs = { action: "list" };
  } else if (
    parsedArgs.action === "start" ||
    parsedArgs.action === "start-detached"
  ) {
    const action = parsedArgs.action;
    const flavor = (parsedArgs._.length > 0
      ? parsedArgs._[0]
      : DefaultFlavor) as any as FlavorName;

    finalArgs = {
      flavor,
      action,
      ...(expandArgs(parsedArgs) as Omit<
        StartArgs<FlavorName>,
        "flavor" | "action"
      >)
    };
  } else {
    throw new Error(`Unknown action: ${parsedArgs.action}`);
  }

  return finalArgs;
}

/**
 * Expands the arguments into an object including only namespaced keys from the
 * `args` argument.
 * @param  {object} args to be expanded
 * @returns {object} with the expanded arguments
 */
export function expandArgs(args: object): object {
  const namespacedArgs = {};

  for (const key in args) {
    // ignore keys that are kebab-cased - they will be duplicated as camelCase
    if (key.indexOf("-") === -1) {
      // split on the first "."
      const [namespace, option] = key.split(/\.(.+)/);
      // only copy namespaced/group keys, and ignore keys with kebab cases
      if (option) {
        if (!namespacedArgs[namespace]) {
          namespacedArgs[namespace] = {};
        }
        namespacedArgs[namespace][option] = args[key];
      }
    }
  }

  return namespacedArgs;
}
