import { ConfigFileManager } from "../src/config-file-manager";
import { VersionCheckConfig } from "../src/types";
import assert from "assert";
import * as fs from "fs";

describe("ConfigFileManager", () => {
  let cfm;
  const testConfig: VersionCheckConfig = {
    packageName: "test",
    enabled: true,
    lastNotification: 0,
    url: "test",
    ttl: 100,
    latestVersion: "99.99.99",
    latestVersionLogged: "99.99.90",
    disableInCI: false,
    didInit: true
  };
  const sparseConfig: VersionCheckConfig = {
    packageName: "test"
  };
  const extraConfig = {
    packageName: "test",
    badProperty: "should not make it to conf"
  };
  afterEach(() => {
    if (cfm) {
      const testConfigFileLocation = cfm.configFileLocation;
      if (fs.existsSync(testConfigFileLocation)) {
        fs.unlinkSync(testConfigFileLocation);
      }
    }
  });
  describe("constructor", () => {
    it("starts with a default config", () => {
      const defaultConfig = ConfigFileManager.DEFAULTS;
      cfm = new ConfigFileManager();

      assert.deepStrictEqual(defaultConfig, cfm.getConfig());
    });
    it("saves the config file on first run", () => {
      cfm = new ConfigFileManager();

      assert.strictEqual(fs.existsSync(cfm.configFileLocation), true);
    });
    it("accepts a config constructor param config", () => {
      const defaultConfig = ConfigFileManager.DEFAULTS;
      cfm = new ConfigFileManager(testConfig);

      assert.notDeepStrictEqual(defaultConfig, cfm.getConfig());
      assert.deepStrictEqual(testConfig, cfm.getConfig());
    });

    it("does not clobber existing config on startup", () => {
      cfm = new ConfigFileManager(testConfig);

      cfm = new ConfigFileManager();
      assert.deepStrictEqual(testConfig, cfm.getConfig());
    });
  });
  describe("configFileLocation", () => {
    it("stores the config file path", () => {
      cfm = new ConfigFileManager();

      assert.strictEqual(fs.existsSync(cfm.configFileLocation), true);
    });
  });
  describe("getConfig", () => {
    it("returns the config", () => {
      assert.deepStrictEqual(cfm.getConfig(), ConfigFileManager.DEFAULTS);
    });
  });
  describe("setConfig", () => {
    it("saves a whole config", () => {
      cfm = new ConfigFileManager(testConfig);
      assert.deepStrictEqual(cfm.getConfig(), testConfig);
    });
    it("saves a sparse config", () => {
      cfm = new ConfigFileManager(sparseConfig);

      assert.deepStrictEqual(cfm.getConfig(), {
        ...ConfigFileManager.DEFAULTS,
        ...sparseConfig
      });
    });
    it("ignores invalid config properties", () => {
      cfm = new ConfigFileManager(extraConfig);

      assert.deepStrictEqual(cfm.getConfig().badProperty, undefined);
    });
  });
});
