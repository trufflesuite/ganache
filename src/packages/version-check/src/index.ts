import { TruffleColors } from "@ganache/colors";
import http2 from "http2";
import { semverRegex } from "./semver";
import Conf from "conf";

export class VersionChecker {
  protected ConfigManager;
  protected _config;
  protected _logger;
  protected _current;

  constructor(options) {
    const { configName, logger, current } = options;
    this.ConfigManager = new Conf({
      ...VersionChecker.DEFAULTS,
      configName
    });

    this._config = this.ConfigManager.get("config");
    this._logger = logger || function () {};
    this._current = current;
  }

  init() {
    if (!this._config.enabled) return false;
    // send server request

    // Have we already alerted the user to latest version?

    // Log version change message
    const { latestVersion } = this._config;
    const versionChange = this.upgradeIsAvailable(this._current, latestVersion);

    if (versionChange) {
    }
  }

  setLatestVersion(latestVersion) {
    this.set("latestVersion", latestVersion);
  }

  setTTL(ttl) {
    this.set("ttl", ttl);
  }

  setUrl(url) {
    this.set("url", url);
  }

  setEnabled(enabled) {
    this.set("enabled", enabled);
  }

  private set(key, value) {
    this._config[key] = value;
    this.ConfigManager.set("config", this._config);
  }

  // Intentionally verbose here if we get logging involved it could aid debugging
  upgradeIsAvailable(current, latest) {
    // No current version passed in
    if (!current) {
      return false;
      // We are in local DEV
    } else if (current === "DEV") {
      return false;
      // We are on latest version
    } else if (current === latest) {
      return false;
      // Invalid current version string
    } else if (typeof current !== "string") {
      return false;
    } else if (current === "") {
      return false;
    }
    // returns falsy if function cannot detect semver difference
    return this.detectSemverChange(current, latest);
  }

  detectSemverChange(current, latest) {
    const [_, major, minor, patch] = current
      .match(semverRegex)
      .slice(1, 4)
      .map(Number);
    const [updateMajor, updateMinor, updatePatch] = latest
      .match(semverRegex)
      .slice(1, 4)
      .map(Number);

    return updateMajor !== major
      ? "major"
      : updateMinor !== minor
      ? "minor"
      : updatePatch !== patch
      ? "patch"
      : null;
  }

  getLatestVersion() {
    if (!this._config.enabled) return false;
    // Send fetch request
    // Compare to latest in config
    // If mismatch, update latestVersion to fetched version
    //              update lastCheck to Date.now()
  }

  log() {
    if (!this._config.enabled) return false;
    // Check if we have already alerted the user config.lastVersionAlerted === config.latestVersion
    // compare current to latest stored in config and set by getLatestVersion
    // If different, log
    // update lastVersionAlerted to config.latestVersion.
  }

  static get DEFAULTS() {
    return {
      projectName: "versionCheck",
      configName: "default",
      defaults: {
        config: {
          enabled: true,
          url: "https://version.trufflesuite.com/",
          ttl: 300, // http2session.setTimeout
          latestVersion: "0.0.0", // Last version fetched from the server
          lastVersionAlerted: "0.0.0", // Last version user to tell the user about
          lastCheck: Date.now() // Timestamp for last successful server version fetch
        }
      }
    };
  }
}

export const logIfUpgradeRequired = (options: {
  name: string;
  logger: { log: any };
  current: string;
  latest: string;
}) => {
  const { current, name, logger, latest } = options;

  if (current === "DEV") {
    return false;
  } else if (typeof current === "string" && current !== "") {
    try {
      if (current === latest) return false;

      function getUpgradeType(current: string, update: string) {
        const [_, major, minor, patch] = current
          .match(semverRegex)
          .slice(1, 4)
          .map(Number);
        const [updateMajor, updateMinor, updatePatch] = update
          .match(semverRegex)
          .slice(1, 4)
          .map(Number);

        return updateMajor !== major
          ? "major"
          : updateMinor !== minor
          ? "minor"
          : updatePatch !== patch
          ? "patch"
          : null;
      }

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
        // destructuring the string to get the characters as codePOints
        return [...str.replace(reAnsiEscapes, "")].length;
      };

      // compare the two sem versions, if the latest version is newer than the current version
      // log a message to the user
      const upgradeType = getUpgradeType(current, latest);
      if (!upgradeType) return false;

      const line1 = chalk`New {hex("${TruffleColors.porsche}") ${upgradeType}} version of ${name} available! {hex("${TruffleColors.watermelon}") ${current}} ⇢ {hex("${TruffleColors.green}") ${latest}} `;
      const line2 = chalk`{hex("${TruffleColors.porsche}") Changelog:} {hex("${TruffleColors.turquoise}") https://github.com/trufflesuite/${name}/releases/v${latest}}`;
      const line3 = chalk`Run {hex("${TruffleColors.green}") npm install -g ${name}@${latest}} to update!`;
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
      logger.log(message.join("\n"));

      return true;
    } catch {
      // If we fail to tell the user about an update it is unfortunate, but not
      // the end of the world, so swallow the error and continue.
      return false;
    }
  } else {
    return false;
  }
};

export const getLatestVersionNumber = (name: "ganache" | "truffle") => {
  return new Promise<string>((resolve, reject) => {
    // The `http2.connect` method creates a new session with example.com
    const session = http2.connect("https://version.trufflesuite.com/");

    // If there is any error in connecting, log it to the console
    session.on("error", err => reject(err));

    const req = session.request({ ":path": `/?name=${name}` });
    // since we don't have any more data to send as
    // part of the request, we can end it
    req.end();

    // To fetch the response body, we set the encoding
    // we want and initialize an empty data string
    req.setEncoding("utf8");
    let data = "";

    // append response data to the data string every time
    // we receive new data chunks in the response
    req.on("data", chunk => {
      data += chunk;
    });

    // Once the response is finished, log the entire data
    // that we received
    req.on("end", () => {
      resolve(data);
      // In this case, we don't want to make any more
      // requests, so we can close the session
      session.close();
    });
  });
};