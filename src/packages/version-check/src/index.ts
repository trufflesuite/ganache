import { TruffleColors } from "@ganache/colors";
import http2 from "http2";
import { semverRegex } from "./semver";
import Conf from "conf";

export default class VersionChecker {
  protected ConfigManager;
  protected _config;
  protected _logger;
  protected _currentVersion;

  constructor(currentVersion, config?, logger?) {
    // Creates a new config, or reads existing from disk
    this.ConfigManager = new Conf({
      configName: process.env.TEST ? "testConfig" : "config", // config is the package default
      defaults: {
        ...VersionChecker.DEFAULTS,
        ...config
      }
    });

    // pulls the config out of the manager, lays optional props over top
    this._config = { ...this.ConfigManager.get("config"), ...config };

    // If config was passed in, save changes
    if (config) this.saveConfig();

    this._currentVersion = currentVersion;
    this._logger = logger || console;
  }

  init() {
    if (!this._config.enabled) return false;
    // all this should do is send the fetchRequest
  }

  setEnabled(enabled) {
    this.set("enabled", enabled);
  }

  setLatestVersion(latestVersion) {
    this.set("latestVersion", latestVersion);
  }

  setLatestVersionLogged(latestVersionLogged) {
    this.set("latestVersionLogged", latestVersionLogged);
  }

  setPackageName(packageName) {
    this.set("packageName", packageName);
  }

  setTTL(ttl) {
    this.set("ttl", ttl);
  }

  setUrl(url) {
    this.set("url", url);
  }

  private set(key, value) {
    this._config[key] = value;
    this.saveConfig();
  }

  private saveConfig() {
    this.ConfigManager.set("config", this._config);
  }

  configFileLocation() {
    return this.ConfigManager.path;
  }

  // Intentionally verbose here if we get logging involved it could aid debugging
  canNotifyUser() {
    const currentVersion = this._currentVersion;
    const latestVersion = this._config.latestVersion;
    // No currentVersion version passed in
    if (!currentVersion) {
      return false;
      // We are in local DEV
    } else if (currentVersion === "DEV") {
      return false;
      // Invalid currentVersion version string
    } else if (typeof currentVersion !== "string") {
      return false;
    } else if (this.alreadyLoggedThisVersion()) {
      return false;
    }
    // returns falsy if function cannot detect semver difference
    return !!this.detectSemverChange(currentVersion, latestVersion);
  }

  detectSemverChange(currentVersion, latestVersion) {
    if (currentVersion > latestVersion || currentVersion === latestVersion)
      return null;

    const [_, major, minor, patch] = currentVersion
      .match(semverRegex)
      .slice(1, 4)
      .map(Number);
    const [updateMajor, updateMinor, updatePatch] = latestVersion
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
    // update latestVersion to fetched version
    // update lastCheck to Date.now()
  }

  alreadyLoggedThisVersion() {
    return this._config.latestVersionLogged === this._config.latestVersion;
  }

  log() {
    if (!this._config.enabled || !this.canNotifyUser()) return false;

    const currentVersion = this._currentVersion;
    const { packageName, latestVersion } = this._config;

    const upgradeType = this.detectSemverChange(currentVersion, latestVersion);

    this.logMessage({
      upgradeType,
      packageName,
      currentVersion,
      latestVersion
    });
    this.setLatestVersionLogged(latestVersion);
    return true;
  }

  // TODO detect context for different log messages -> Startup vs --version (pretty vs string)
  logMessage(options) {
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
      // destructuring the string to get the characters as codePOints
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
    this._logger.log(message.join("\n"));
  }

  static get DEFAULTS() {
    return {
      config: {
        packageName: "ganache",
        enabled: true,
        url: "https://version.trufflesuite.com/",
        ttl: 300, // http2session.setTimeout
        latestVersion: "0.0.0", // Last version fetched from the server
        latestVersionLogged: "0.0.0", // Last version user to tell the user about
        lastCheck: 0 // Timestamp for last successful server version fetch
      }
    };
  }
}

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
