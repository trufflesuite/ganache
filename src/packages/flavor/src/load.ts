import chalk from "chalk";
import { TruffleColors } from "@ganache/colors";
import { AnyFlavor } from "./flavor";
import { hasOwn } from "@ganache/utils";

/**
 * Load the given package using node's `require` function. This is used to load
 * flavors plugins.
 * @param flavor
 * @returns
 */
export function load<F extends AnyFlavor>(flavor: F["flavor"]): F {
  // `@ganache/filecoin` used to be named just `filecoin`, we we need to
  // preserve this alias for backwards compatibility
  if (flavor === "filecoin") flavor = "@ganache/filecoin";
  try {
    // we use `eval` to prevent webpack from resolving the `require` statement.
    const flavorImport = eval("require")(flavor);

    // @ganache/filecoin used to not have a `default` export and that version is
    // missing many properties we need now, so we fail for those old versions.
    if (flavor === "@ganache/filecoin" && !flavorImport.default) {
      // avoid printing stack trace as it's webpacked and is not helpful
      console.error(
        "Your version of @ganache/filecoin is outdated. Please install the latest version by running `npm install @ganache/filecoin --global`."
      );
      process.exit(1);
    }

    return flavorImport.default;
  } catch (e: any) {
    if (
      hasOwn(e, "message") &&
      typeof e.message === "string" &&
      e.message.includes(`Cannot find module '${flavor}'`)
    ) {
      const NEED_HELP = "Need help? Reach out to the Truffle community at";
      const COMMUNITY_LINK = "https://trfl.io/support";

      // we print and exit rather than throw to prevent webpack output from being
      // spat out for the line number
      console.warn(
        chalk`\n\n{red.bold ERROR:} Could not find Ganache flavor "{bold ${flavor}}"; ` +
          `it probably\nneeds to be installed.\n` +
          ` ▸ if you're using Ganache as a library run: \n` +
          chalk`   {blue.bold $ npm install ${flavor}}\n` +
          ` ▸ if you're using Ganache as a CLI run: \n` +
          chalk`   {blue.bold $ npm install --global ${flavor}}\n\n` +
          chalk`{hex("${TruffleColors.porsche}").bold ${NEED_HELP}}\n` +
          chalk`{hex("${TruffleColors.turquoise}") ${COMMUNITY_LINK}}\n\n`
      );
      process.exit(1);
    } else {
      throw e;
    }
  }
}
