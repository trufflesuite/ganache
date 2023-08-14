import { marked } from "marked";
import TerminalRenderer from "marked-terminal";
import chalk from "chalk";
import yargs, { Options } from "yargs";
import {
  Base,
  Defaults,
  Definitions,
  YargsPrimitiveCliTypeStrings
} from "@ganache/options";
import { EOL } from "os";
import { TruffleColors } from "@ganache/colors";

marked.setOptions({
  renderer: new TerminalRenderer({
    codespan: chalk.hex(TruffleColors.porsche),
    // Disable `unescape` since doesn't work for everything (we just do it ourselves)
    unescape: false
  })
});

export const wrapWidth = Math.min(120, yargs.terminalWidth());

const addAliases = (args: yargs.Argv<{}>, aliases: string[], key: string) => {
  const options = { hidden: true, alias: key };
  return aliases.reduce((args, a) => args.option(a, options), args);
};

export function applyDefaults<D extends Defaults<any>>(
  defaults: D,
  args: yargs.Argv<{}>
) {
  for (const category in defaults) {
    type GroupType = `${Capitalize<typeof category>}:`;
    const group = `${category[0].toUpperCase()}${category.slice(
      1
    )}:` as GroupType;
    const categoryObj = defaults[
      category
    ] as unknown as Definitions<Base.Config>;
    const state = {};
    for (const option in categoryObj) {
      const optionObj = categoryObj[option];
      addOption(state, category, group, option, optionObj, args);
    }
  }
}

function unescapeEntities(html: string) {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\*\#COLON\|\*/g, ":");
}
export const highlight = (t: string) => unescapeEntities(marked.parseInline(t));
export const center = (str: string, length: number) =>
  " ".repeat(Math.max(0, Math.floor((wrapWidth - length) / 2))) + str;

function addOption(
  state: any,
  category: string,
  group: string,
  option: string,
  optionObj: Definitions<Base.Config>[string],
  argv: yargs.Argv
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
        ? optionObj.default(state).toString()
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
