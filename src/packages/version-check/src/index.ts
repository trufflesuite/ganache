import { TruffleColors } from "@ganache/colors";
const chalk = require("chalk");

const reAnsiEscapes = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
const wrapWidth = Math.min(120, process.stdout.columns || 0);
const center = (str: string, width: number) => {
  const mid = ((width - visibleCharacterLength(str))) / 2;
  if (mid < 0) return str;

  const left = Math.floor(mid);
  const right = Math.ceil(mid);
  return " ".repeat(left) + str + " ".repeat(right);
}
const visibleCharacterLength = (str: string) => {
  // if the string contains unicode characters we need to count them,
  // destructuring the string to get the characters as codePOints
  return [...str.replace(reAnsiEscapes, "")].length;
}

import http2 from "http2";
import { semverRegex } from "./semver";

function getUpgradeType(current: string, update: string) {
  const [_, major, minor, patch] = current.match(semverRegex).slice(1, 4).map(Number);
  const [updateMajor, updateMinor, updatePatch] = update.match(semverRegex).slice(1, 4).map(Number);

  return updateMajor !== major ? 'major'
    : updateMinor !== minor ? 'minor'
      : updatePatch !== patch ? 'patch'
        : null;
}

export const logIfUpgradeRequired = async (options: {
  name: string,
  logger: { log: any },
  current: string,
  latest: string
}
) => {
  const { current, name, logger, latest } = options;
  if (current === "DEV") {
    return false;
  } else if (typeof current === "string" && current !== "") {
    try {
      if (current === latest) return false;

      // compare the two sem versions, if the latest version is newer than the current version
      // log a message to the user
      const upgradeType = getUpgradeType(current, latest);
      if (!upgradeType) return false;
      const line1 = chalk`New {hex("${TruffleColors.porsche}") ${upgradeType}} version of ${name} available! {red ${current}} ⇢ {green ${latest}} `;
      const line2 = chalk`{hex("${TruffleColors.porsche}") Changelog:} {hex("${TruffleColors.turquoise}") https://github.com/trufflesuite/${name}/releases/v${latest}}`;
      const line3 = chalk`Run {green npm install -g ${name}@${latest}} to update!`;
      const width = Math.max(visibleCharacterLength(line1), visibleCharacterLength(line2), visibleCharacterLength(line3)) + 4;
      const vPipe = chalk`{hex("#C4A000") ║}`;
      const hLines = "═".repeat(width);
      const emptyLine = center(vPipe + " ".repeat(width) + vPipe, wrapWidth)
      const message = [""];
      message.push(chalk`{hex("#C4A000") ${center("╔" + hLines + "╗", wrapWidth)}}`);
      message.push(emptyLine);
      message.push(center(vPipe + center(line1, width) + vPipe, wrapWidth));
      message.push(center(vPipe + center(line2, width) + vPipe, wrapWidth));
      message.push(center(vPipe + center(line3, width) + vPipe, wrapWidth));
      message.push(emptyLine);
      message.push(chalk`{hex("#C4A000") ${center("╚" + hLines + "╝", wrapWidth)}}`);
      message.push("");
      logger.log(message.join("\n"));

      return true;
    } catch (e) {
      console.error(e);
    }
  } else {
    return false;
  }
}

export const getLatestVersionNumber = (name: "ganache" | "truffle") => {
  return new Promise<string>((resolve, reject) => {
    // The `http2.connect` method creates a new session with example.com
    const session = http2.connect('https://version.trufflesuite.com/');


    // If there is any error in connecting, log it to the console
    session.on('error', (err) => reject(err));

    const req = session.request({ ':path': `/?name=${name}` });
    // since we don't have any more data to send as
    // part of the request, we can end it
    req.end();

    // To fetch the response body, we set the encoding
    // we want and initialize an empty data string
    req.setEncoding('utf8');
    let data = '';

    // append response data to the data string every time
    // we receive new data chunks in the response
    req.on('data', (chunk) => { data += chunk });

    // Once the response is finished, log the entire data
    // that we received
    req.on('end', () => {
      resolve(data);
      // In this case, we don't want to make any more
      // requests, so we can close the session
      session.close();
    });
  });
};
