import Conf from "conf";
import { ConfigManager, AnyJSON, ConfigFileManagerOptions } from "./types";

/**
 * Manages configuration changes between the defaultConfig,
 * existingConfig, and config (new) values. Values are assigned as:
 *
 * {
 * ...defaultConfig,
 * ...existingConfig,
 * ...config
 * }
 *
 * Sets an internal property on the config, `__cfmDidInit`, to track
 * if it is the first time setting this config. __cfmDidInit is treated
 * like a reserved word and removed from `getConfig`.
 *
 * Removing this flag will not cause a crash it will just incur
 * an extra disk write in the constructor the next time the app
 * starts.
 */
export class ConfigFileManager {
  private _configFile: ConfigManager;
  private _config: AnyJSON;
  /**
   * the file on disk will be:
   * ~/.config/@ganache/version-check-nodejs/configName.json
   *
   * VERSION_CHECK_CONFIG_NAME is used in unit testing to avoid
   * clobbering any existing conf file stored on disk.Do not test
   * the "config" branch or you may destroy an existing config.
   *
   * @param  {ConfigFileManagerOptions={}} options
   */
  constructor(options: ConfigFileManagerOptions = {}) {
    this._configFile = new Conf({
      configName: process.env.VERSION_CHECK_CONFIG_NAME
        ? process.env.VERSION_CHECK_CONFIG_NAME //
        : "config" // config is the Conf package default
    });

    // on first run, this will be '{}' but there is no way
    // to know if this is the default, or if the user
    // actually set this at some point. Conf will not save
    // the empty file. see: __cfmDidInit
    const existingConfig = this._configFile.get();

    const { defaultConfig, config } = options;

    this._config = {
      ...this.validateConfig(defaultConfig),
      ...existingConfig,
      ...this.validateConfig(config)
    };

    // On first run, save the current config to disk.
    // An interal property, __cfmDidInit, is used to track this.
    // Else only save when a new config is passed.
    if (!existingConfig.__cfmDidInit) {
      this._config.__cfmDidInit = true;
      this.saveConfig();
    } else if (config) this.saveConfig();
  }
  /**
   * Returns the path of the file on disk
   */
  get configFileLocation() {
    return this._configFile.path;
  }
  /**
   * Returns a copy of the current config.
   */
  getConfig() {
    const config = { ...this._config };
    delete config.__cfmDidInit;
    return config;
  }
  /**
   * updates the config with a partial of complete config.
   * @param  {AnyJSON} config - partial or complete config.
   */
  setConfig(config: AnyJSON) {
    this._config = { ...this._config, ...this.validateConfig(config) };
    this.saveConfig();
    return this.getConfig();
  }

  private saveConfig() {
    this._configFile.set(this._config);
  }
  /**
   * In case someone tries to use the reserved property, __cfmDidInit,
   * strip it out. Since configs are optional in some places this protects
   * against undefined values coming from userland.
   * @param  {AnyJSON} config
   */
  private validateConfig(config: AnyJSON) {
    if (!config) return {};
    delete config.__cfmDidInit;
    return config;
  }
}
