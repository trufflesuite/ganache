import { TruffleColors } from "@ganache/colors";
export type BannerMessageOptions = {
  upgradeType: string;
  packageName: string;
  currentVersion: string;
  latestVersion: string;
};

export function bannerMessage(options: BannerMessageOptions) {
  const { upgradeType, packageName, currentVersion, latestVersion } = options;

  const chalk = require("chalk");

  const reAnsiEscapes =
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  const WRAP_WIDTH = Math.min(120, process.stdout.columns || 0);
  const center = (str: string, width: number) => {
    const mid = (width - visibleCharacterLength(str)) / 2;
    if (mid < 0) return str;

    const left = Math.floor(mid);
    const right = Math.ceil(mid);
    return " ".repeat(left) + str + " ".repeat(right);
  };
  const visibleCharacterLength = (str: string) => {
    // if the string contains unicode characters we need to count them,
    // destructuring the string to get the characters as codePoints
    return [...str.replace(reAnsiEscapes, "")].length;
  };

  const line1 = chalk`New {hex("${TruffleColors.porsche}") ${upgradeType}} version of ${packageName} available! {hex("${TruffleColors.watermelon}") ${currentVersion}} ⇢ {hex("${TruffleColors.green}") ${latestVersion}} `;
  const line2 = chalk`{hex("${TruffleColors.porsche}") Changelog:} {hex("${TruffleColors.turquoise}") https://github.com/trufflesuite/${packageName}/releases/v${latestVersion}}`;
  const line3 = chalk`Run {hex("${TruffleColors.green}") npm install -g ${packageName}@${latestVersion}} to update!`;
  const width =
    Math.max(
      visibleCharacterLength(line1),
      visibleCharacterLength(line2),
      visibleCharacterLength(line3)
    ) + 4;
  const wrapWidth = Math.max(width, WRAP_WIDTH);
  const vPipe = chalk`{hex("${TruffleColors.yellow}") ║}`;
  const hLines = "═".repeat(width);
  const emptyLine = center(
    vPipe + " ".repeat(width) + vPipe,
    Math.max(width, wrapWidth)
  );
  const message = [""];
  message.push(
    chalk`{hex("${TruffleColors.yellow}") ${center(
      "╔" + hLines + "╗",
      wrapWidth
    )}}`
  );
  message.push(emptyLine);
  message.push(center(vPipe + center(line1, width) + vPipe, wrapWidth));
  message.push(center(vPipe + center(line2, width) + vPipe, wrapWidth));
  message.push(center(vPipe + center(line3, width) + vPipe, wrapWidth));
  message.push(emptyLine);
  message.push(
    chalk`{hex("${TruffleColors.yellow}") ${center(
      "╚" + hLines + "╝",
      wrapWidth
    )}}`
  );
  message.push("");
  return message.join("\n");
}
