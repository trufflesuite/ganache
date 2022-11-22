import { VersionCheck } from "../src/version-check";
import { ConfigFileManager } from "../src/config-file-manager";
import { VersionCheckOptions } from "../src/types";
import assert from "assert";
import * as fs from "fs";

describe("ConfigFileManager", () => {
  let cfm;
  const testConfig: VersionCheckOptions = {
    packageName: "test",
    enabled: true,
    lastNotification: 0,
    url: "test",
    ttl: 100,
    latestVersion: "99.99.99",
    lastVersionLogged: "99.99.90",
    disableInCI: false
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
      const defaultConfig = VersionCheck.DEFAULTS;
      cfm = new ConfigFileManager({ defaultConfig });

      assert.deepStrictEqual(defaultConfig, cfm.getConfig());
    });
    it("saves the config file on first run", () => {
      cfm = new ConfigFileManager();

      assert.strictEqual(fs.existsSync(cfm.configFileLocation), true);
    });
    it("accepts a config constructor param config", () => {
      const defaultConfig = VersionCheck.DEFAULTS;
      cfm = new ConfigFileManager({ config: testConfig });

      assert.notDeepStrictEqual(defaultConfig, cfm.getConfig());
      assert.deepStrictEqual(testConfig, cfm.getConfig());
    });

    it("does not clobber existing config on startup", () => {
      cfm = new ConfigFileManager({ config: testConfig });

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
      cfm = new ConfigFileManager({ defaultConfig: VersionCheck.DEFAULTS });
      assert.deepStrictEqual(cfm.getConfig(), VersionCheck.DEFAULTS);
    });
  });
  describe("setConfig", () => {
    it("set a config property", () => {
      cfm = new ConfigFileManager({ config: testConfig });

      cfm.setConfig({ enabled: false });
      assert.deepStrictEqual(cfm.getConfig().enabled, false);
    });
  });
});
