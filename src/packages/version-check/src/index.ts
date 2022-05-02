import { TruffleColors } from "@ganache/colors";
import http2 from "http2";
import Conf from "conf";
import { default as semverDiff } from "semver/functions/diff";
import { default as semverValid } from "semver/functions/valid";
import { default as semverClean } from "semver/functions/clean";
import { default as semverGte } from "semver/functions/gte";

export type VersionCheckConfig = {
  packageName: string;
  enabled: boolean;
  url: string;
  ttl: number;
  latestVersion: string;
  latestVersionLogged: string;
};

export class VersionCheck {
  protected ConfigManager;
  protected _config;
  protected _logger;
  protected _currentVersion;

  constructor(
    currentVersion: string,
    config?: VersionCheckConfig,
    logger?: Function
  ) {
    // Creates a new config, or reads existing from disk
    this.ConfigManager = new Conf({
      configName: process.env.TEST ? "testConfig" : "config", // config is the package default
      defaults: {
        ...VersionCheck.DEFAULTS,
        ...config
      }
    });

    // pulls the config out of the manager, lays optional props over top
    this._config = { ...this.ConfigManager.get("config"), ...config };

    // If config was passed in, save changes
    if (config) this.saveConfig();

    if (this.isValidSemver(currentVersion)) {
      this._currentVersion = this.cleanSemver(currentVersion);
    } else {
      // Semver is invalid, turn off version check
      this._currentVersion = false;
      this._config.enabled = false;
    }

    this._logger = logger || console;
  }

  init() {
    this.getLatestVersion();
    return this;
  }

  cleanSemver(semver) {
    return semverClean(semver);
  }

  isValidSemver(semver) {
    return semverValid(semver);
  }

  setEnabled(enabled) {
    this.set("enabled", enabled);
  }

  setLatestVersion(latestVersion) {
    if (this.isValidSemver(latestVersion)) {
      this.set("latestVersion", latestVersion);
    }
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
    } else if (this.alreadyLoggedThisVersion()) {
      return false;
    }
    // returns falsy if function cannot detect semver difference
    return !!this.detectSemverChange(currentVersion, latestVersion);
  }

  detectSemverChange(currentVersion, latestVersion) {
    if (
      !currentVersion ||
      !latestVersion ||
      !this.isValidSemver(currentVersion) ||
      !this.isValidSemver(latestVersion) ||
      semverGte(currentVersion, latestVersion)
    )
      return null;

    return semverDiff(currentVersion, latestVersion);
  }

  async getLatestVersion() {
    if (!this._config.enabled) return false;
    try {
      const latestVersion = this.cleanSemver(await this.fetchLatestVersion());
      this.setLatestVersion(latestVersion);
      return true;
    } catch (e) {
      // The fail is silent
      return false;
    }
  }

  private fetchLatestVersion() {
    const { packageName, url, ttl } = this._config;

    return new Promise<string>((resolve, reject) => {
      const session = http2.connect(url);

      session.on("error", err => reject(err));

      const req = session.request({ ":path": `/?name=${packageName}` });

      req.setEncoding("utf8");

      req
        .on("error", reject)
        .on("response", (headers, flags) => {
          let data = "";
          req
            .on("data", chunk => {
              data += chunk;
            })
            .on("end", async () => {
              resolve(data);
              session.close();
            });

          req.end();
        })
        .setTimeout(ttl, () => {
          req.close();
          reject();
        });
    });
  }

  alreadyLoggedThisVersion() {
    return semverGte(
      this._config.latestVersionLogged,
      this._config.latestVersion
    );
  }

  log() {
    if (!this._config.enabled || !this.canNotifyUser()) return false;

    const currentVersion = this._currentVersion;
    const { packageName, latestVersion } = this._config;

    const upgradeType = this.detectSemverChange(currentVersion, latestVersion);

    this.logBannerMessage({
      upgradeType,
      packageName,
      currentVersion,
      latestVersion
    });
    this.setLatestVersionLogged(latestVersion);
    return true;
  }

  logBannerMessage(options) {
    const { upgradeType, packageName, currentVersion, latestVersion } = options;

    if (!(upgradeType && packageName && currentVersion && latestVersion))
      return false;

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
    return true;
  }

  // This is called with --version and is displayed each time
  getVersionMessage() {
    const currentVersion = this._currentVersion;
    const { latestVersion } = this._config;
    if (this.detectSemverChange(currentVersion, latestVersion)) {
      return `note: there is a new version available! ${currentVersion} -> ${latestVersion}`;
    }
    return "";
  }

  static get DEFAULTS(): { config: VersionCheckConfig } {
    return {
      config: {
        packageName: "ganache",
        enabled: true,
        url: "https://version.trufflesuite.com",
        ttl: 300, // http2session.setTimeout
        latestVersion: "0.0.0", // Last version fetched from the server
        latestVersionLogged: "0.0.0" // Last version to tell the user about
      }
    };
  }
}
