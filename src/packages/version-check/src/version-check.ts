import http2 from "http2";
import { Logger } from "@ganache/ethereum-options";
import {
  semverIsValid,
  semverUpgradeType,
  semverClean,
  semverGte
} from "./semver";
import { isCI } from "./ci";
import { ConfigFileManager } from "./config-file-manager";
import { bannerMessage } from "./banner-message";
import type { VersionCheckOptions } from "./types";

// Why is this not part of the config? Well, if a user
// set this to a low value there could be problems.
const ONE_DAY: number = 86400;

/**
 * Requests the `latestVersion` semver from a remote url.
 *
 *
 *
 * @param  {string} currentVersion
 * @param  {VersionCheckOptions} config?
 * @param  {Logger} logger?
 */
export class VersionCheck {
  private ConfigFileManager: ConfigFileManager;
  private _config: VersionCheckOptions;
  private _logger: Logger;
  private _currentVersion: string;

  private _session: http2.ClientHttp2Session;
  private _request: http2.ClientHttp2Stream;
  private _notificationInterval: number = ONE_DAY;

  constructor(
    currentVersion: string,
    config?: VersionCheckOptions,
    logger?: Logger
  ) {
    // This will manage the config file on disk.
    this.ConfigFileManager = new ConfigFileManager({
      defaultConfig: VersionCheck.DEFAULTS,
      config: this._sanitizeConfig(config)
    });

    this._config = this.ConfigFileManager.getConfig();

    // If we are running in CI, disable and quit.
    if (this._config.disableInCI && isCI()) {
      this.disable();
    } else {
      if (semverIsValid(currentVersion)) {
        this._currentVersion = semverClean(currentVersion);
      } else {
        this.disable();
      }

      this._logger = logger || console;
      this.getLatestVersion();
    }
  }
  /**
   * Accepts a partial or whole config object.
   *
   * Never make changes or alter ._config directly, use _updateConfig.
   *
   * @param  {VersionCheckOptions} config
   */
  private _updateConfig(config: VersionCheckOptions) {
    this._config = this.ConfigFileManager.setConfig(
      this._sanitizeConfig(config)
    );
  }

  private _sanitizeConfig(config: VersionCheckOptions) {
    if (!config) return config;

    const tempConfig = { ...this._config, ...config };
    return Object.keys(VersionCheck.DEFAULTS).reduce((validConfig, key) => {
      if (tempConfig.hasOwnProperty(key)) validConfig[key] = tempConfig[key];

      return validConfig;
    }, {});
  }

  /**
   * Returns the current config that is used by VersionCheck.
   *
   * @returns VersionCheckOptions
   */
  getConfig(): VersionCheckOptions {
    return this._config;
  }

  get configFileLocation(): string {
    return this.ConfigFileManager.configFileLocation;
  }
  /**
   * Destroys any active requests and sets its config `enabled`
   * to false.
   */
  disable() {
    this.destroy();
    this._updateConfig({ enabled: false });
  }
  /**
   * Closes and destroys any active requests.
   */
  destroy() {
    if (this._request) {
      this._request.close();
    }

    if (this._session) {
      this._session.close();
    }

    this._request = null;
    this._session = null;
  }
  /**
   * Checks whether the required parameters pass for
   * notifying the user of a newer version.
   *
   * @returns boolean
   */
  canNotifyUser(): boolean {
    return (
      !!this._currentVersion &&
      this._config.enabled &&
      !this.alreadyLoggedLatestVersion() &&
      this.notificationIntervalHasPassed()
    );
  }
  /**
   * Returns true if the user has already been notified of the
   * `latestVersion` or higher.
   *
   * @returns boolean
   */
  alreadyLoggedLatestVersion(): boolean {
    return semverGte(
      this._config.lastVersionLogged,
      this._config.latestVersion
    );
  }
  /**
   * Returns true if the hardcoded `_notificationInterval` amount of
   * time has passed since the last time we notified the user.
   *
   * @returns boolean
   */
  notificationIntervalHasPassed(): boolean {
    const timePassed = Date.now() - this._config.lastNotification;
    return timePassed > this._notificationInterval;
  }
  /**
   * Makes the request and updates the config with the latest semver.
   */
  async getLatestVersion() {
    if (this._config.enabled) {
      try {
        this._updateConfig({
          latestVersion: await this._fetchLatest()
        });
      } catch {}
    }
  }
  /**
   * Makes the request to config.url
   * @returns Promise
   */
  private _fetchLatest(): Promise<string> {
    this.destroy();
    const { packageName, url, ttl } = this._config;

    return new Promise<string>((resolve, reject) => {
      const session = http2.connect(url);
      const req = session.request({ ":path": `/?name=${packageName}` });

      this._session = session;
      this._request = req;

      session.on("error", err => reject(err));
      req.setEncoding("utf8");

      req
        .on("error", reject)
        .on("response", (headers, flags) => {
          let data: string = "";
          req
            .on("data", chunk => {
              data += chunk;
            })
            .on("end", async () => {
              resolve(data);
              session.close();
            });
        })
        .setTimeout(ttl, () => {
          this.destroy();
          reject(`ttl expired: ${ttl}`);
        });
      req.end();
    });
  }
  /**
   * Shows the banner message to the user on ganache startup.
   *
   */
  log() {
    if (this.canNotifyUser()) {
      const currentVersion = this._currentVersion;
      const { packageName, latestVersion } = this._config;

      const upgradeType = semverUpgradeType(currentVersion, latestVersion);

      this._logger.log(
        bannerMessage({
          upgradeType,
          packageName,
          currentVersion,
          latestVersion
        })
      );

      this._updateConfig({
        lastNotification: Date.now(),
        lastVersionLogged: latestVersion
      });
    }
  }

  /**
   * Appended to `ganache --version` if a newer version is known.
   */
  cliMessage() {
    const currentVersion = this._currentVersion;
    const { latestVersion } = this._config;
    if (semverUpgradeType(currentVersion, latestVersion)) {
      return `note: there is a new version available! ${currentVersion} -> ${latestVersion}`;
    }
    return "";
  }

  static get DEFAULTS(): VersionCheckOptions {
    return {
      packageName: "ganache",
      enabled: false,
      url: "https://version.trufflesuite.com",
      ttl: 30000, // http2session.setTimeout
      latestVersion: "0.0.0", // Last version fetched from the server
      lastVersionLogged: "0.0.0", // Last version to tell the user about
      lastNotification: 0,
      disableInCI: true
    };
  }
}
