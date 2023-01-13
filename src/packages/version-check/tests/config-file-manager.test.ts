process.env.VC_ACTIVATED = "true";

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
    it("starts without a config", () => {
      cfm = new ConfigFileManager();

      // {} is the default, empty value from Conf
      assert.deepStrictEqual({}, cfm.getConfig());
    });
    it("passing a config in the constructor clobbers existing config", () => {
      const defaultConfig = VersionCheck.DEFAULTS;
      cfm = new ConfigFileManager(testConfig);
      cfm = new ConfigFileManager(defaultConfig);

      assert.deepStrictEqual(defaultConfig, cfm.getConfig());
    });
  });
  describe("configFileLocation", () => {
    it("stores the config file path", () => {
      cfm = new ConfigFileManager(testConfig);

      assert.strictEqual(fs.existsSync(cfm.configFileLocation), true);
    });
  });
  describe("getConfig", () => {
    it("returns the config", () => {
      cfm = new ConfigFileManager(VersionCheck.DEFAULTS);
      assert.deepStrictEqual(cfm.getConfig(), VersionCheck.DEFAULTS);
    });
  });
  describe("setConfig", () => {
    it("sets a config property", () => {
      cfm = new ConfigFileManager(testConfig);

      cfm.setConfig({ enabled: false });
      assert.deepStrictEqual(cfm.getConfig().enabled, false);
    });
  });
});
