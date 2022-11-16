import Conf from "conf";
import { VersionCheckConfig, ConfigManager } from "./types";

export class ConfigFileManager {
  private _configFile: ConfigManager;
  private _config: VersionCheckConfig;

  constructor(config: VersionCheckConfig) {
    this._configFile = new Conf({
      configName: process.env.VERSION_CHECK_CONFIG_NAME
        ? process.env.VERSION_CHECK_CONFIG_NAME
        : "config" // config is the Conf package default
    });

    this._config = {
      ...ConfigFileManager.DEFAULTS,
      ...this._configFile.get(),
      ...config
    };

    // If a config was passed, save to disk. Else, already
    // saved config will be used, or the default config.
    if (config) this.saveConfig();
  }

  configFileLocation() {
    return this._configFile.path;
  }

  getConfig() {
    return this._config;
  }

  setConfig(config: VersionCheckConfig) {
    const {
      packageName,
      enabled,
      url,
      ttl,
      latestVersion,
      latestVersionLogged,
      lastNotification,
      disableInCI
    } = { ...this._config, ...config };

    this._config = {
      packageName,
      enabled,
      url,
      ttl,
      latestVersion,
      latestVersionLogged,
      lastNotification,
      disableInCI
    };
    this.saveConfig();
    return this._config;
  }

  private saveConfig() {
    this._configFile.set(this._config);
  }

  static get DEFAULTS(): VersionCheckConfig {
    return {
      packageName: "ganache",
      enabled: false,
      url: "https://version.trufflesuite.com",
      ttl: 2000, // http2session.setTimeout
      latestVersion: "0.0.0", // Last version fetched from the server
      latestVersionLogged: "0.0.0", // Last version to tell the user about
      lastNotification: 0,
      disableInCI: true
    };
  }
}
