process.env.VERSION_CHECK_CONFIG_NAME = "testConfig";
import { VersionCheckConfig } from "../src/types";
import { VersionCheck } from "../src/version-check";
import { semverUpgradeType } from "../src/semver";
import { ConfigFileManager } from "../src/config-file-manager";
import http2 from "http2";
import assert from "assert";
import * as fs from "fs";

describe("@ganache/version-check", () => {
  let vc;
  const testVersion = "0.0.0";
  const versionString = "v1.2.3";
  const version = "1.2.3";

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
    packageName: "test",
    enabled: true,
    url: "test",
    ttl: 100,
    latestVersion: "99.99.99",
    disableInCI: false
  };

  let message;
  const testLogger = { log: str => (message = str) };

  beforeEach(() => {
    vc = new VersionCheck(testVersion);

    message = "";
  });

  afterEach(() => {
    const testConfigFileLocation = vc.configFileLocation();
    if (fs.existsSync(testConfigFileLocation)) {
      fs.unlinkSync(testConfigFileLocation);
    }
  });

  describe("constructor", () => {
    it("sets the current version", () => {
      assert(
        vc._currentVersion === testVersion,
        "currentVersion incorrectly set by constructor"
      );
    });
    it("instantiates with the default config", () => {
      const config = ConfigFileManager.DEFAULTS;

      assert.deepStrictEqual(
        vc._config,
        config,
        "Default Config values do not match newly created version checker"
      );
    });
    it("is set to opt out by default", () => {
      const config = ConfigFileManager.DEFAULTS;

      assert.equal(
        config.enabled,
        false,
        "Default Config enabled is set to true, should be opt out by default for now"
      );
    });
    it("sets an optional config", () => {
      vc = new VersionCheck(testVersion, testConfig);

      assert.deepStrictEqual(
        vc._config,
        testConfig,
        "testConfig is not set in the version checker."
      );
    });
    it("sets an optional sparse config", () => {
      const expectedConfig = {
        ...ConfigFileManager.DEFAULTS,
        ...sparseConfig
      };

      vc = new VersionCheck(testVersion, sparseConfig);

      assert.deepStrictEqual(vc._config, expectedConfig);
    });
    it("disables if currentVersion is not a valid semver", () => {
      vc = new VersionCheck("");

      assert.equal(vc._config.enabled, false);
    });
    it("sets an optional logger", () => {
      const someData = "some data";
      const customLogger = {
        log: data => {
          return data;
        }
      };
      vc = new VersionCheck("", testConfig, customLogger);
      const loggedData = vc._logger.log(someData);

      assert(
        loggedData === someData,
        "Custom logger data inconsistent with supplied data"
      );
    });

    it("uses console for the default logger", () => {
      assert(vc._logger == console, "Default logger is not set to console");
    });

    it("cleans the currentVersion semver", () => {
      vc = new VersionCheck(versionString);

      assert.equal(vc._currentVersion, version);
    });
    it("disables if CI is detected", () => {
      process.env.TRUFFLE_SHUFFLE_TEST = "true";

      vc = new VersionCheck(versionString, {
        enabled: true,
        disableInCI: true
      });
      assert.equal(vc._config.enabled, false);
      delete process.env.TRUFFLE_SHUFFLE_TEST;
    });
  });

  describe("ConfigFileManager", () => {
    it("persists config changes to disk", () => {
      const vc2 = new VersionCheck(testVersion, testConfig);

      const vc3 = new VersionCheck(testVersion);

      assert.deepStrictEqual(
        vc2.getConfig(),
        vc3.getConfig(),
        "ConfigFileManager improperly saves config to disk"
      );
    });
    it("persists the config across multiple instantiation types (no clobber)", () => {
      let vc = new VersionCheck(testVersion);
      const initialConfig = vc.getConfig();
      assert.deepStrictEqual(initialConfig, ConfigFileManager.DEFAULTS);

      vc = new VersionCheck(testVersion);
      assert.deepStrictEqual(initialConfig, vc.getConfig());

      vc = new VersionCheck(testVersion, testConfig);
      assert.deepStrictEqual(
        { ...initialConfig, ...testConfig },
        vc.getConfig()
      );
    });
  });

  describe("canNotifyUser", () => {
    it("false if !currentVersion or currentVersion === falsy", () => {
      vc = new VersionCheck("");
      const canNotifyUser = vc.canNotifyUser();

      assert.equal(
        canNotifyUser,
        false,
        "Version Check will notify if !currentVersion"
      );
    });
    it("false if currentVersion === DEV", () => {
      vc = new VersionCheck("DEV");
      const canNotifyUser = vc.canNotifyUser();

      assert.equal(
        canNotifyUser,
        false,
        "Version Check will notify if currentVersion === DEV"
      );
    });
    it("false if currentVersion === latestVersion", () => {
      vc = new VersionCheck(testVersion);
      const canNotifyUser = vc.canNotifyUser();

      assert.equal(
        canNotifyUser,
        false,
        "Version Check will notify if currentVersion === latestVersion"
      );
    });
    it("false if typeof currentVersion !== string", () => {
      vc = new VersionCheck("");
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
    it("false if notification Interval has not passed", async () => {
      const currentVersion = "0.0.1";
      const config = {
        latestVersion: "1.0.0",
        enabled: true,
        disableInCI: false
      };
      vc = new VersionCheck(currentVersion, config);
      vc.alreadyLoggedThisVersion = () => false;

      let canNotifyUser = vc.canNotifyUser();

      assert.equal(canNotifyUser, true);

      vc._config.lastNotification = new Date().getTime();
      canNotifyUser = vc.canNotifyUser();

      assert.equal(canNotifyUser, false);
    });

    it("true if currentVersion is a valid semver < latestVersion that has not been previously logged to the user", () => {
      const currentVersion = "0.0.1";
      const config = {
        latestVersion: "1.0.0",
        enabled: true,
        disableInCI: false
      };
      vc = new VersionCheck(currentVersion, config);
      vc.alreadyLoggedThisVersion = () => false;

      const canNotifyUser = vc.canNotifyUser();

      assert.equal(
        canNotifyUser,
        true,
        "Version Check will not notify if checks pass"
      );
    });
  });

  describe("alreadyLoggedThisVersion", () => {
    it("true if config.latestVersionLogged < latestVersion", () => {
      const config = {
        latestVersionLogged: "0.0.0",
        latestVersion: "1.0.0",
        disableInCI: false
      };
      vc = new VersionCheck("0.0.0", config);

      assert.equal(
        vc.alreadyLoggedThisVersion(),
        false,
        "alreadyLoggedThisVersion is true when latestVersionLogged < latestVersion"
      );
    });
    it("false if config.latestVersionLogged = latestVersion", () => {
      const config = {
        latestVersionLogged: "1.0.0",
        latestVersion: "1.0.0",
        disableInCI: false
      };
      vc = new VersionCheck("0.0.0", config);

      assert.equal(
        vc.alreadyLoggedThisVersion(),
        true,
        "alreadyLoggedThisVersion is false when latestVersionLogged = latestVersion"
      );
    });
    it("false if config.latestVersionLogged > latestVersion", () => {
      const config = {
        latestVersionLogged: "2.0.0",
        latestVersion: "1.0.0",
        disableInCI: false
      };
      vc = new VersionCheck("0.0.0", config);

      assert.equal(
        vc.alreadyLoggedThisVersion(),
        true,
        "alreadyLoggedThisVersion is false when latestVersionLogged > latestVersion"
      );
    });
  });

  describe("cliMessage", () => {
    let options;

    beforeEach(() => {
      options = {
        upgradeType: "major",
        packageName: "ganache",
        currentVersion: "1.2.3",
        latestVersion: "3.2.1",
        disableInCI: false
      };

      vc = new VersionCheck(
        options.currentVersion,
        { latestVersion: options.latestVersion },
        testLogger
      );
      message = "";
    });

    it("will not log if semver is the same between currentVersion and latestVersion", () => {
      vc = new VersionCheck(
        options.currentVersion,
        {
          latestVersion: options.currentVersion
        },
        testLogger
      );

      const didLog = !!vc.cliMessage();

      assert.equal(didLog, false);
    });

    it("logs a single line with the currentVersion and latestVersion", () => {
      vc = new VersionCheck(
        options.currentVersion,
        { latestVersion: options.latestVersion },
        testLogger
      );
      const message = vc.cliMessage();

      assert.equal(message.indexOf(options.currentVersion) >= 0, true);
      assert.equal(message.indexOf(options.latestVersion) >= 0, true);
    });

    it("logs regardless of whether VersionCheck is enabled", () => {
      vc.disable();

      const didLog = !!vc.cliMessage();

      assert.equal(didLog, true);
    });
  });

  describe("log", () => {
    it("will not log if disabled", () => {
      vc.disable();

      assert.strictEqual(message, "", "Version Check will log if disabled.");
    });
    it("will not log if currentVersion !== semver", () => {
      vc = new VersionCheck("DEV", { disableInCI: false });
      assert.strictEqual(
        message,
        "",
        "Version Check will log if currentVersion === DEV."
      );
    });
    it("will not log if canNotifyUser() is false", () => {
      vc.canNotifyUser = () => false;

      assert.strictEqual(message, "", "Version Check will log if disabled.");
    });
    it("compares the constructor currentVersion to config.latestVersion", () => {
      testConfig.latestVersionLogged = "0.0.0";
      vc = new VersionCheck(testVersion, testConfig, testLogger);
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
    it("reports the upgradeType based on semverUpgradeType", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);

      const upgradeType = semverUpgradeType(
        testVersion,
        testConfig.latestVersion as string
      );
      vc.log();

      assert.equal(
        message.indexOf(upgradeType) >= 0,
        true,
        "Log does not contain the correct upgradeType"
      );
    });
    it("logs the message", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);

      vc.log();

      assert.equal(
        message.length > 0,
        true,
        "Log does not display the message"
      );
    });
    it("sets the latest version", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);

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
    it("only logs the latestVersion one time", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);

      vc.log();

      assert.strictEqual(
        message.length > 0,
        true,
        "Log did not log the first time for this version"
      );
      message = "";
      vc.log();

      assert.strictEqual(message, "", "logged the same version message twice");
    });

    it("message contains the upgradeType", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);
      vc.log();

      const upgradeType = semverUpgradeType(
        vc._currentVersion,
        vc._config.latestVersion
      );

      assert.strictEqual(
        message.indexOf(upgradeType) >= 0,
        true,
        "Message does not contain the upgradeType"
      );
    });

    it("message contains the packageName", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);
      vc.log();

      assert.strictEqual(
        message.indexOf(vc._config.packageName) >= 0,
        true,
        "Message does not contain the upgradeType"
      );
    });
    it("message contains the currentVersion", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);
      vc.log();

      assert.strictEqual(
        message.indexOf(vc._currentVersion) >= 0,
        true,
        "Message does not contain the upgradeType"
      );
    });
    it("message contains the latestVersion", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);
      vc.log();

      assert.equal(
        message.indexOf(vc._config.latestVersion) >= 0,
        true,
        "Message does not contain the upgradeType"
      );
    });
    it("process.stdout.columns === -1", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);
      process.stdout.columns = -1;

      vc.log();

      assert.equal(message.length > 0, true, "Message did not log");
    });
    it("process.stdout.columns === null", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);
      process.stdout.columns = 0;

      vc.log();

      assert.equal(message.length > 0, true, "Message did not log");
    });
  });

  describe("getLatestVersion/fetchLatest", () => {
    let api;
    const apiResponse = "1.0.0";
    const apiSettings = {
      port: 4000,
      path: "/?name=ganache"
    };

    beforeEach(() => {
      api = http2.createServer();
      api.on("error", err => console.error(err));

      api.on("stream", (stream, headers) => {
        const path = headers[":path"];
        const method = headers[":method"];

        if (path === "/?name=ganache" && method === "GET") {
          if (stream.closed) return;

          stream.respond({
            ":status": 200
          });
          stream.write(apiResponse);
          stream.end();
        } else {
          stream.respond({
            ":status": 404
          });
          stream.end();
        }
      });

      api.listen(apiSettings.port);
      vc = new VersionCheck(
        testVersion,
        {
          enabled: true,
          url: "http://localhost:" + apiSettings.port
        },
        testLogger
      );
    });

    afterEach(() => {
      api.close();
    });

    it("will not getLatestVersion if version check is disabled", async () => {
      vc.disable();

      await vc.getLatestVersion();

      const { latestVersion } = vc.getConfig();

      assert.strictEqual(
        latestVersion,
        testVersion,
        "Version Check will fetchLatest if disabled."
      );
    });

    it("fetches the latest version from the API", async () => {
      let latestVersion;

      latestVersion = await vc.fetchLatest();

      assert.equal(latestVersion === apiResponse, true);
    });
    it("does not fetch if vc is disabled", async () => {});

    it("fetches the latest version and sets it in the config file.", async () => {
      const currentVersion = vc._currentVersion;

      assert.equal(currentVersion, testVersion);

      await vc.getLatestVersion();

      const latestVersion = vc._config.latestVersion;

      assert.equal(latestVersion, apiResponse);
    });
    it("sets lastNotification in the config", async () => {
      const lastNotification = vc._config.lastNotification;
      await vc.getLatestVersion();

      const thisNotification = vc._config.lastNotification;

      assert.equal(lastNotification, 0);
      assert.notEqual(thisNotification, lastNotification);
    });
  });

  describe("destroy", () => {
    it("sets status to 'destroyed'", () => {
      vc.destroy();

      assert.equal(vc._request, null);
      assert.equal(vc._session, null);
    });
  });

  describe("notificationIntervalHasPassed", () => {
    it("returns true", () => {
      const hasPassed = vc.notificationIntervalHasPassed();
      assert.equal(hasPassed, true);
    });
    it("returns false", () => {
      const lastNotification = Date.now();

      vc = new VersionCheck(testVersion, { lastNotification }, testLogger);

      const hasPassed = vc.notificationIntervalHasPassed();
      assert.equal(hasPassed, false);
    });
  });
});
