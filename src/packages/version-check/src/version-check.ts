import http2 from "http2";
import { Logger } from "@ganache/ethereum-options";
import {
  semverIsValid,
  semverUpgradeType,
  semverClean,
  semverGte
} from "./semver";
import { detectCI } from "./ci";
import { ConfigFileManager } from "./config-file-manager";
import { bannerMessage } from "./banner-message";
import type { VersionCheckConfig } from "./types";

const ONE_DAY: number = 86400;

export class VersionCheck {
  private ConfigFileManager: ConfigFileManager;
  private _config: VersionCheckConfig;
  private _logger: Logger;
  private _currentVersion: string;

  private _session: http2.ClientHttp2Session;
  private _request: http2.ClientHttp2Stream;
  private _notificationInterval: number = ONE_DAY;

  constructor(
    currentVersion: string,
    config?: VersionCheckConfig,
    logger?: Logger
  ) {
    this.ConfigFileManager = new ConfigFileManager(config);

    this._config = this.getConfig();

    if (this._config.disableInCI && detectCI()) {
      this.disable();
    }

    if (semverIsValid(currentVersion)) {
      this._currentVersion = semverClean(currentVersion);
    } else {
      this.disable();
    }

    this._logger = logger || console;
    this.getLatestVersion();
  }

  private _setConfig(config: VersionCheckConfig) {
    this._config = this.ConfigFileManager.setConfig(config);
  }

  getConfig(): VersionCheckConfig {
    return this.ConfigFileManager.getConfig();
  }

  configFileLocation(): string {
    return this.ConfigFileManager.configFileLocation();
  }

  disable() {
    this._setConfig({ enabled: false });
  }

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

  canNotifyUser(): boolean {
    return (
      !!this._currentVersion &&
      this._config.enabled &&
      !this.alreadyLoggedThisVersion() &&
      this.notificationIntervalHasPassed()
    );
  }

  alreadyLoggedThisVersion(): boolean {
    return semverGte(
      this._config.latestVersionLogged,
      this._config.latestVersion
    );
  }

  notificationIntervalHasPassed(): boolean {
    const timePassed = Date.now() - this._config.lastNotification;
    return timePassed > this._notificationInterval;
  }

  async getLatestVersion() {
    if (this._config.enabled) {
      try {
        this._setConfig({
          latestVersion: await this.fetchLatest(),
          lastNotification: new Date().getTime()
        });
      } catch {}
    }
  }

  private fetchLatest(): Promise<string> {
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
          req.close();
          session.close();
          reject(`ttl expired: ${ttl}`);
        });
      req.end();
    });
  }

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

      this._setConfig({
        latestVersionLogged: latestVersion
      });
    }
  }

  // This is called with --version and is displayed each time
  cliMessage() {
    const currentVersion = this._currentVersion;
    const { latestVersion } = this._config;
    if (semverUpgradeType(currentVersion, latestVersion)) {
      return `note: there is a new version available! ${currentVersion} -> ${latestVersion}`;
    }
    return "";
  }
}
