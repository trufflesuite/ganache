// @ts-nocheck
process.env.TEST = "true";

import VersionChecker from "../src/";
import http2 from "http2";
import assert from "assert";
import * as fs from "fs";

describe("@ganache/version-check", () => {
  let vc;
  const testVersion = "0.0.0";
  const testConfig = {
    packageName: "test",
    enabled: true,
    url: "test",
    ttl: 100,
    latestVersion: "99.99.99",
    latestVersionLogged: "99.99.90"
  };

  let message;
  const testLogger = { log: str => (message = str) };

  beforeEach(() => {
    vc = new VersionChecker(testVersion);

    message = "";
  });

  afterEach(() => {
    const testConfigFileLocation = vc.configFileLocation(); // process.env.TEST is set above
    fs.unlinkSync(testConfigFileLocation);
  });

  describe("constructor", () => {
    it("sets the current version", () => {
      assert(
        vc._currentVersion === testVersion,
        "currentVersion incorrectly set by constructor"
      );
    });
    it("instantiates with the default config", () => {
      const { config } = VersionChecker.DEFAULTS;

      assert.deepStrictEqual(
        vc._config,
        config,
        "Default Config values do not match newly created version checker"
      );
    });
    it("sets an optional config", () => {
      vc = new VersionChecker(testVersion, testConfig);

      assert.deepStrictEqual(
        vc._config,
        testConfig,
        "testConfig is not set in the version checker."
      );
    });
    it("sets an optional sparse config", () => {});
    it("sets an optional logger", () => {
      const someData = "some data";
      const customLogger = {
        log: data => {
          return data;
        }
      };
      vc = new VersionChecker(null, null, customLogger);
      const loggedData = vc._logger.log(someData);

      assert(
        loggedData === someData,
        "Custom logger data inconsistent with supplied data"
      );
    });

    it("uses console for the default logger", () => {
      assert(vc._logger == console, "Default logger is not set to console");
    });
  });

  describe("ConfigManager", () => {
    it("persists config changes to disk", () => {
      const vc2 = new VersionChecker(testVersion, testConfig);
      vc2.setEnabled(false);

      const vc3 = new VersionChecker(testVersion);

      assert.deepStrictEqual(
        vc2._config,
        vc3._config,
        "ConfigManager improperly saves config to disk"
      );
    });
  });

  describe("config setters", () => {
    it("sets the stored config and VersionChecker _config", () => {
      const packageName = "new name";
      vc.setPackageName(packageName);
      assert.equal(
        packageName,
        vc._config.packageName,
        "_config incorrectly set"
      );

      const savedConfig = vc.ConfigManager.get("config");
      assert.equal(
        packageName,
        savedConfig.packageName,
        "ConfigManager did not save correctly"
      );
    });
    it("setPackageName", () => {
      const packageName = "new name";
      vc.setPackageName(packageName);
      assert.equal(
        packageName,
        vc._config.packageName,
        "packageName incorrectly set"
      );
    });
    it("setUrl", () => {
      const url = "url";
      vc.setUrl(url);
      assert.equal(url, vc._config.url, "URL incorrectly set");
    });
    it("ssetTTL", () => {
      const ttl = 200;
      vc.setTTL(ttl);
      assert.equal(ttl, vc._config.ttl, "TTL incorrectly set");
    });
    it("setEnabled", () => {
      const enabled = false;
      vc.setEnabled(enabled);
      assert.equal(enabled, vc._config.enabled, "Enabled incorrectly set");
    });
    it("setLatestVersion", () => {
      const latestVersion = "9001";
      vc.setLatestVersion(latestVersion);
      assert.equal(
        latestVersion,
        vc._config.latestVersion,
        "latestVersion incorrectly set"
      );
    });
    it("setLatestVersionLogged", () => {
      const latestVersionLogged = "9001";
      vc.setLatestVersionLogged(latestVersionLogged);
      assert.equal(
        latestVersionLogged,
        vc._config.latestVersionLogged,
        "setLatestVersionLogged incorrectly set"
      );
    });
  });

  describe("canNotifyUser", () => {
    it("false if !currentVersion or currentVersion === falsy", () => {
      vc = new VersionChecker(null);
      const canNotifyUser = vc.canNotifyUser();

      assert.equal(
        canNotifyUser,
        false,
        "Version Check will notify if !currentVersion"
      );
    });
    it("false if currentVersion === DEV", () => {
      vc = new VersionChecker("DEV");
      const canNotifyUser = vc.canNotifyUser();

      assert.equal(
        canNotifyUser,
        false,
        "Version Check will notify if currentVersion === DEV"
      );
    });
    it("false if currentVersion === latestVersion", () => {
      vc = new VersionChecker(testVersion);
      const canNotifyUser = vc.canNotifyUser();

      assert.equal(
        canNotifyUser,
        false,
        "Version Check will notify if currentVersion === latestVersion"
      );
    });
    it("false if typeof currentVersion !== string", () => {
      vc = new VersionChecker(123);
      const canNotifyUser = vc.canNotifyUser();

      assert.equal(
        canNotifyUser,
        false,
        "Version Check will notify if typeof currentVersion !== string"
      );
    });
    it("false if latestVersionLogged === latestVersion", () => {
      vc.alreadyLoggedThisVersion = () => true;

      const canNotifyUser = vc.canNotifyUser();

      assert.equal(
        canNotifyUser,
        false,
        "Version Check will notify if alreadyLoggedThisVersion is true"
      );
    });
    it("false if detectSumverChange is falsy", () => {
      vc.alreadyLoggedThisVersion = () => false;
      vc.detectSemverChange = () => null;

      const canNotifyUser = vc.canNotifyUser();

      assert.equal(
        canNotifyUser,
        false,
        "Version Check will notify if detectSemverChange is falsy"
      );
    });
    it("true if currentVersion is a valid semver < latestVersion that has not been previously logged to the user", () => {
      const currentVersion = "0.0.1";
      const config = {
        latestVersion: "1.0.0"
      };
      vc = new VersionChecker(currentVersion, config);
      vc.alreadyLoggedThisVersion = () => false;

      const canNotifyUser = vc.canNotifyUser();

      assert.equal(
        canNotifyUser,
        true,
        "Version Check will not notify if checks pass"
      );
    });
  });

  describe("detectSemverChange", () => {
    describe("patches", () => {
      it("0.0.0 -> 0.0.1", () => {
        const currentVersion = "0.0.0";
        const latestVersion = "0.0.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "patch",
          "0.0.0 -> 0.0.1 fails"
        );
      });
      it("0.0.1 -> 0.0.1", () => {
        const currentVersion = "0.0.1";
        const latestVersion = "0.0.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "0.0.1 -> 0.0.1 fails"
        );
      });
      it("0.0.2 -> 0.0.1", () => {
        const currentVersion = "0.0.2";
        const latestVersion = "0.0.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "0.0.2 -> 0.0.1 fails"
        );
      });
    });
    describe("minors", () => {
      it("0.0.0 -> 0.1.0", () => {
        const currentVersion = "0.0.0";
        const latestVersion = "0.1.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "minor",
          "0.0.0 -> 0.1.0 fails"
        );
      });
      it("0.1.0 -> 0.1.0", () => {
        const currentVersion = "0.1.0";
        const latestVersion = "0.1.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "0.1.0 -> 0.1.0 fails"
        );
      });
      it("0.2.0 -> 0.1.0", () => {
        const currentVersion = "0.2.0";
        const latestVersion = "0.1.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "0.2.0 -> 0.1.0 fails"
        );
      });
    });
    describe("minors and patches", () => {
      it("0.0.0 -> 0.1.1", () => {
        const currentVersion = "0.0.0";
        const latestVersion = "0.1.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "minor",
          "0.0.0 -> 0.1.1 fails"
        );
      });

      it("0.0.1 -> 0.1.1", () => {
        const currentVersion = "0.0.1";
        const latestVersion = "0.1.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "minor",
          "0.0.1 -> 0.1.1 fails"
        );
      });

      it("0.0.2 -> 0.1.1", () => {
        const currentVersion = "0.0.2";
        const latestVersion = "0.1.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "minor",
          "0.0.2 -> 0.1.1 fails"
        );
      });

      it("0.1.0 -> 0.1.1", () => {
        const currentVersion = "0.1.0";
        const latestVersion = "0.1.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "patch",
          "0.1.0 -> 0.1.1 fails"
        );
      });

      it("0.1.1 -> 0.1.1", () => {
        const currentVersion = "0.1.1";
        const latestVersion = "0.1.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "0.1.1 -> 0.1.1 fails"
        );
      });
      it("0.1.2 -> 0.1.1", () => {
        const currentVersion = "0.1.2";
        const latestVersion = "0.1.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "0.1.2 -> 0.1.1 fails"
        );
      });
      it("0.2.2 -> 0.1.1", () => {
        const currentVersion = "0.2.2";
        const latestVersion = "0.1.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "0.2.2 -> 0.1.1 fails"
        );
      });
      it("0.2.0 -> 0.1.1", () => {
        const currentVersion = "0.2.0";
        const latestVersion = "0.1.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "0.2.0 -> 0.1.1 fails"
        );
      });
      it("0.2.5 -> 0.1.1", () => {
        const currentVersion = "0.2.5";
        const latestVersion = "0.1.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "0.2.5 -> 0.1.1 fails"
        );
      });
    });
    describe("majors", () => {
      it("0.0.0 -> 1.0.0", () => {
        const currentVersion = "0.0.0";
        const latestVersion = "1.0.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "major",
          "0.0.0 -> 1.0.0 fails"
        );
      });
      it("1.0.0 -> 1.0.0", () => {
        const currentVersion = "1.0.0";
        const latestVersion = "1.0.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "1.0.0 -> 1.0.0 fails"
        );
      });
      it("2.0.0 -> 1.0.0", () => {
        const currentVersion = "2.0.0";
        const latestVersion = "1.0.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "2.0.0 -> 1.0.0 fails"
        );
      });
    });
    describe("majors and patches", () => {
      it("0.0.0 -> 1.0.1", () => {
        const currentVersion = "0.0.0";
        const latestVersion = "1.0.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "major",
          "0.0.0 -> 1.0.1 fails"
        );
      });
      it("0.0.1 -> 1.0.1", () => {
        const currentVersion = "0.0.1";
        const latestVersion = "1.0.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "major",
          "0.0.1 -> 1.0.1 fails"
        );
      });
      it("0.0.2 -> 1.0.1", () => {
        const currentVersion = "0.0.2";
        const latestVersion = "1.0.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "major",
          "0.0.2 -> 1.0.1 fails"
        );
      });

      it("1.0.0 -> 1.0.1", () => {
        const currentVersion = "1.0.0";
        const latestVersion = "1.0.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "patch",
          "1.0.0 -> 1.0.1 fails"
        );
      });

      it("1.0.1 -> 1.0.1", () => {
        const currentVersion = "1.0.1";
        const latestVersion = "1.0.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "1.0.1 -> 1.0.1 fails"
        );
      });
      it("1.0.2 -> 1.0.1", () => {
        const currentVersion = "1.0.2";
        const latestVersion = "1.0.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "1.0.2 -> 1.0.1 fails"
        );
      });
      it("2.0.2 -> 1.0.1", () => {
        const currentVersion = "2.0.2";
        const latestVersion = "1.0.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "2.0.2 -> 1.0.1 fails"
        );
      });
      it("2.0.0 -> 1.0.1", () => {
        const currentVersion = "2.0.0";
        const latestVersion = "1.0.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "2.0.0 -> 1.0.1 fails"
        );
      });
      it("2.0.5 -> 1.0.1", () => {
        const currentVersion = "2.0.5";
        const latestVersion = "1.0.1";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "2.0.5 -> 1.0.1 fails"
        );
      });
    });
    describe("majors and minors", () => {
      it("0.0.0 -> 1.1.0", () => {
        const currentVersion = "0.0.0";
        const latestVersion = "1.1.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "major",
          "0.0.0 -> 1.1.0 fails"
        );
      });

      it("0.1.0 -> 1.1.0", () => {
        const currentVersion = "0.1.0";
        const latestVersion = "1.1.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "major",
          "0.1.0 -> 1.1.0 fails"
        );
      });

      it("0.2.0 -> 1.1.0", () => {
        const currentVersion = "0.2.0";
        const latestVersion = "1.1.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "major",
          "0.2.0 -> 1.1.0 fails"
        );
      });

      it("1.0.0 -> 1.1.0", () => {
        const currentVersion = "1.0.0";
        const latestVersion = "1.1.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "minor",
          "1.0.0 -> 1.1.0 fails"
        );
      });

      it("1.1.0 -> 1.1.0", () => {
        const currentVersion = "1.1.0";
        const latestVersion = "1.1.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "1.1.0 -> 1.1.0 fails"
        );
      });
      it("1.2.0 -> 1.1.0", () => {
        const currentVersion = "1.2.0";
        const latestVersion = "1.1.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "1.2.0 -> 1.1.0 fails"
        );
      });
      it("2.2.0 -> 1.1.0", () => {
        const currentVersion = "2.2.0";
        const latestVersion = "1.1.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "2.2.0 -> 1.1.0 fails"
        );
      });
      it("2.0.0 -> 1.1.0", () => {
        const currentVersion = "2.0.0";
        const latestVersion = "1.1.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "2.0.0 -> 1.1.0 fails"
        );
      });
      it("2.5.0 -> 1.1.0", () => {
        const currentVersion = "2.5.0";
        const latestVersion = "1.1.0";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "2.5.0 -> 1.1.0 fails"
        );
      });
    });
    describe("majors and minors and patches", () => {
      it("0.0.0 -> 5.5.5", () => {
        const currentVersion = "0.0.0";
        const latestVersion = "5.5.5";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "major",
          "0.0.0 -> 5.5.5 fails"
        );
      });
      it("5.5.5 -> 5.5.5", () => {
        const currentVersion = "5.5.5";
        const latestVersion = "5.5.5";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "5.5.5 -> 5.5.5 fails"
        );
      });
      it("5.5.6 -> 5.5.5", () => {
        const currentVersion = "5.5.6";
        const latestVersion = "5.5.5";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "5.5.6 -> 5.5.5 fails"
        );
      });
      it("5.6.5 -> 5.5.5", () => {
        const currentVersion = "5.5.5";
        const latestVersion = "5.5.5";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "5.6.5 -> 5.5.5 fails"
        );
      });
      it("5.6.6 -> 5.5.5", () => {
        const currentVersion = "5.6.6";
        const latestVersion = "5.5.5";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "5.6.6 -> 5.5.5 fails"
        );
      });
      it("6.5.5 -> 5.5.5", () => {
        const currentVersion = "6.5.5";
        const latestVersion = "5.5.5";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "6.5.5 -> 5.5.5 fails"
        );
      });
      it("6.5.6 -> 5.5.5", () => {
        const currentVersion = "6.5.6";
        const latestVersion = "5.5.5";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "6.5.6 -> 5.5.5 fails"
        );
      });
      it("6.6.6 -> 5.5.5", () => {
        const currentVersion = "6.6.6";
        const latestVersion = "5.5.5";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "6.6.6 -> 5.5.5 fails"
        );
      });
      it("0.0.6 -> 5.5.5", () => {
        const currentVersion = "0.0.6";
        const latestVersion = "5.5.5";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "major",
          "0.0.6 -> 5.5.5 fails"
        );
      });
      it("0.6.0 -> 5.5.5", () => {
        const currentVersion = "0.6.0";
        const latestVersion = "5.5.5";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          "major",
          "0.6.0 -> 5.5.5 fails"
        );
      });
      it("6.0.0 -> 5.5.5", () => {
        const currentVersion = "6.0.0";
        const latestVersion = "5.5.5";

        assert.equal(
          vc.detectSemverChange(currentVersion, latestVersion),
          null,
          "6.0.0 -> 5.5.5 fails"
        );
      });
    });
  });

  describe("alreadyLoggedThisVersion", () => {
    it("true if config.latestVersionLogged < latestVersion", () => {
      const config = {
        latestVersionLogged: "0.0.0",
        latestVersion: "1.0.0"
      };
      vc = new VersionChecker("0.0.0", config);

      assert.equal(
        vc.alreadyLoggedThisVersion(),
        false,
        "alreadyLoggedThisVersion is true when latestVersionLogged < latestVersion"
      );
    });
    it("false if config.latestVersionLogged = latestVersion", () => {
      const config = {
        latestVersionLogged: "1.0.0",
        latestVersion: "1.0.0"
      };
      vc = new VersionChecker("0.0.0", config);

      assert.equal(
        vc.alreadyLoggedThisVersion(),
        true,
        "alreadyLoggedThisVersion is false when latestVersionLogged = latestVersion"
      );
    });
    it("false if config.latestVersionLogged > latestVersion", () => {
      const config = {
        latestVersionLogged: "2.0.0",
        latestVersion: "1.0.0"
      };
      vc = new VersionChecker("0.0.0", config);

      assert.equal(
        vc.alreadyLoggedThisVersion(),
        true,
        "alreadyLoggedThisVersion is false when latestVersionLogged > latestVersion"
      );
    });
  });

  describe("logMessage", () => {
    let options;

    beforeEach(() => {
      options = {
        upgradeType: "major",
        packageName: "ganache",
        currentVersion: "1.2.3",
        latestVersion: "3.2.1"
      };

      vc = new VersionChecker(options.currentVersion, {}, testLogger);
      message = "";
    });

    it("will not log if !upgradeType", () => {
      options.upgradeType = null;
      const didLog = vc.logMessage(options);

      assert.equal(didLog, false, "Will log if !options.upgradeType");
      assert.equal(message, "", "Will log if !options.upgradeType");
    });
    it("will not log if !packageName", () => {
      options.packageName = null;
      const didLog = vc.logMessage(options);

      assert.equal(didLog, false, "Will log if !options.packageName ");
      assert.equal(message, "", "Will log if !options.packageName");
    });
    it("will not log if !currentVersion", () => {
      options.currentVersion = null;
      const didLog = vc.logMessage(options);

      assert.equal(didLog, false, "Will log if !options.currentVersion ");
      assert.equal(message, "", "Will log if !options.currentVersion");
    });
    it("will not log if !latestVersion", () => {
      options.latestVersion = null;
      const didLog = vc.logMessage(options);

      assert.equal(didLog, false, "Will log if !options.latestVersion ");
      assert.equal(message, "", "Will log if !options.latestVersion");
    });
    it("message contains the upgradeType", () => {
      const didLog = vc.logMessage(options);

      assert.equal(didLog, true, "Message did not log");
      assert.equal(
        message.indexOf(options.upgradeType) >= 0,
        true,
        "Message does not contain the upgradeType"
      );
    });
    it("message contains the packageName", () => {
      const didLog = vc.logMessage(options);

      assert.equal(didLog, true, "Message did not log");
      assert.equal(
        message.indexOf(options.packageName) >= 0,
        true,
        "Message does not contain the packageName"
      );
    });
    it("message contains the currentVersion", () => {
      const didLog = vc.logMessage(options);

      assert.equal(didLog, true, "Message did not log");
      assert.equal(
        message.indexOf(options.currentVersion) >= 0,
        true,
        "Message does not contain the currentVersion"
      );
    });
    it("message contains the latestVersion", () => {
      const didLog = vc.logMessage(options);

      assert.equal(didLog, true, "Message did not log");
      assert.equal(
        message.indexOf(options.latestVersion) >= 0,
        true,
        "Message does not contain the latestVersion"
      );
    });
  });

  describe("init", () => {
    it("will not init if version check is disabled", () => {
      vc.setEnabled(false);

      assert.equal(vc.init(), false, "Version Check will init if disabled.");
    });
  });

  describe("getLatestVersion", () => {
    it("will not getLatestVersion if version check is disabled", async () => {
      vc.setEnabled(false);

      assert.equal(
        await vc.getLatestVersion(),
        false,
        "Version Check will fetchLatestVersion if disabled."
      );
    });
  });

  describe("log", () => {
    it("will not log if disabled", () => {
      vc.setEnabled(false);
      vc.canNotifyUser = () => true;

      assert.equal(vc.log(), false, "Version Check will log if disabled.");
    });
    it("will not log if canNotifyUser() is false", () => {
      vc.canNotifyUser = () => false;

      assert.equal(vc.log(), false, "Version Check will log if disabled.");
    });
    it("compares the constructor currentVersion to config.latestVersion", () => {
      testConfig.latestVersionLogged = "0.0.0";
      vc = new VersionChecker(testVersion, testConfig, testLogger);
      vc.log();

      assert.equal(
        message.indexOf(testVersion) >= 0,
        true,
        "Log does not contain currentVersion"
      );
      assert.equal(
        message.indexOf(testConfig.latestVersion) >= 0,
        true,
        "Log does not contain latestVersion"
      );
    });
    it("reports on the config.packageName", () => {
      vc.log();

      assert.equal(
        message.indexOf(testConfig.packageName) >= -1,
        true,
        "Log does not contain the packageName"
      );
    });
    it("reports the upgradeType based on detectSemverChange", () => {
      vc = new VersionChecker(testVersion, testConfig, testLogger);

      const upgradeType = vc.detectSemverChange(
        testVersion,
        testConfig.latestVersion
      );
      vc.log();

      assert.equal(
        message.indexOf(upgradeType) >= 0,
        true,
        "Log does not contain the correct upgradeType"
      );
    });
    it("logs the message", () => {
      vc = new VersionChecker(testVersion, testConfig, testLogger);

      vc.log();

      assert.equal(
        message.length > 0,
        true,
        "Log does not display the message"
      );
    });
    it("sets the latest version", () => {
      vc = new VersionChecker(testVersion, testConfig, testLogger);

      assert.notEqual(
        vc._config.latestVersionLogged,
        testConfig.latestVersion,
        "latestVersion and latestVersionLogged is the same before logging"
      );

      vc.log();

      assert.equal(
        vc._config.latestVersionLogged,
        testConfig.latestVersion,
        "latestVersionLogged was not successfully set after logging version message"
      );
    });
  });

  describe("getLatestVersion/fetchLatestVersion", () => {
    let api;
    const apiResponse = "1.0.0";
    const apiSettings = {
      port: 4000,
      path: "/?name=ganache"
    };

    before(() => {
      api = http2.createServer();
      api.on("error", err => console.error(err));

      api.on("stream", (stream, headers) => {
        const path = headers[":path"];
        const method = headers[":method"];

        if (path === "/?name=ganache" && method === "GET") {
          stream.respond({
            ":status": 200
          });
          stream.write(apiResponse);
        } else {
          stream.respond({
            ":status": 404
          });
        }

        stream.end();
      });

      api.listen(apiSettings.port);
    });

    beforeEach(() => {
      vc = new VersionChecker(testVersion, {
        url: "http://localhost:" + apiSettings.port
      });
    });

    after(() => {
      api.close();
    });

    it("fetches the latest version from the API", async () => {
      let latestVersion;

      latestVersion = await vc.fetchLatestVersion();

      assert.equal(latestVersion === apiResponse, true);
    });

    it("does not fetch if vc is disabled", async () => {
      vc.setEnabled(false);

      let success = await vc.getLatestVersion();
      assert.equal(success, false);

      vc.setEnabled(true);

      success = await vc.getLatestVersion();
      assert.equal(success, true);
    });
    it("fetches the latest version and sets it in the config file.", async () => {
      const currentVersion = vc._currentVersion;

      assert.equal(currentVersion === testVersion, true);

      const success = await vc.getLatestVersion();

      assert.equal(success, true);

      const latestVersion = vc._config.latestVersion;

      assert.equal(latestVersion === apiResponse, true);
    });

    it("cancels requests after the ttl is reached");

    describe("init", () => {
      it("fetches the latest version without blocking", () => {
        vc.init();

        assert(vc._currentVersion === testVersion);
        setTimeout(() => {
          assert(vc._config.latestVersion === apiResponse);
        }, 10);
      });
    });
  });
});
