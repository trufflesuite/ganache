process.env.VERSION_CHECK_CONFIG_NAME = "testConfig";
process.env.VC_ACTIVATED = "true";

import { VersionCheckOptions } from "../src/types";
import { VersionCheck } from "../src/version-check";
import { semverUpgradeType } from "../src/semver";
import http2 from "http2";
import assert from "assert";
import * as fs from "fs";

describe("@ganache/version-check", () => {
  let vc;
  const testVersion = "0.0.0";
  const versionString = "v1.2.3";
  const version = "1.2.3";

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
  const sparseConfig: VersionCheckOptions = {
    packageName: "test",
    enabled: true,
    url: "test",
    ttl: 100,
    latestVersion: "99.99.99",
    disableInCI: false
  };

  let message: string = "";
  const testLogger = { log: str => (message = str) };

  beforeEach(() => {
    process.env.IGNORE_ISCI = "true";
    vc = new VersionCheck(testVersion);

    message = "";
  });

  afterEach(() => {
    const testConfigFileLocation = vc.configFileLocation;
    if (fs.existsSync(testConfigFileLocation)) {
      fs.unlinkSync(testConfigFileLocation);
    }
    delete process.env.IGNORE_ISCI;
  });

  describe("constructor", () => {
    it("sets the current version", () => {
      assert.strictEqual(
        vc._currentVersion,
        testVersion,
        "currentVersion incorrectly set by constructor."
      );
    });
    it("instantiates with the default config", () => {
      const config = VersionCheck.DEFAULTS;

      assert.deepStrictEqual(
        vc._config,
        config,
        "Default Config values do not match newly created version checker."
      );
    });
    it("sets an optional config", () => {
      vc = new VersionCheck(testVersion, testConfig);

      assert.deepStrictEqual(
        vc._config,
        testConfig,
        "testConfig is not set in the constructor."
      );
    });
    it("sets an optional sparse config", () => {
      const expectedConfig = {
        ...VersionCheck.DEFAULTS,
        ...sparseConfig
      };

      vc = new VersionCheck(testVersion, sparseConfig);

      assert.deepStrictEqual(
        vc._config,
        expectedConfig,
        "Sparse config values incorrectly set in constructor."
      );
    });

    it("strips invalid config properties from the constructor param", () => {
      const bogusConfig = {
        iShouldNotExist: "Existential Panic",
        ...testConfig
      };
      vc = new VersionCheck(testVersion, bogusConfig);

      assert.deepStrictEqual(
        vc._config,
        testConfig,
        "Invalid config properties are not removed from config."
      );
    });
    it("disables if currentVersion is not a valid semver.", () => {
      vc = new VersionCheck("invalid-version");

      assert.strictEqual(vc.isEnabled, false);
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

      assert.strictEqual(
        loggedData,
        someData,
        "Custom logger data inconsistent with supplied data."
      );
    });

    it("uses console for the default logger", () => {
      assert.strictEqual(
        vc._logger,
        console,
        "Default logger is not set to console."
      );
    });

    it("cleans the currentVersion semver", () => {
      vc = new VersionCheck(versionString);

      assert.strictEqual(
        vc._currentVersion,
        version,
        "_currentVersion semver does not match constructor semver."
      );
    });
    it("disables if CI is detected", () => {
      delete process.env.IGNORE_ISCI;
      process.env.TRUFFLE_SHUFFLE_TEST = "true";
      vc = new VersionCheck(versionString, {
        enabled: true,
        disableInCI: true
      });
      assert.strictEqual(vc.isEnabled, false, "VC did not disable in CI.");
      delete process.env.TRUFFLE_SHUFFLE_TEST;
    });
  });

  describe("canNotifyUser", () => {
    it("false if !currentVersion or currentVersion === falsy", () => {
      vc = new VersionCheck("");
      const canNotifyUser = vc.canNotifyUser();

      assert.strictEqual(
        canNotifyUser,
        false,
        "Version Check will notify if !currentVersion."
      );
    });
    it("false if currentVersion === DEV", () => {
      vc = new VersionCheck("DEV");
      const canNotifyUser = vc.canNotifyUser();

      assert.strictEqual(
        canNotifyUser,
        false,
        "Version Check will notify if currentVersion === DEV."
      );
    });
    it("false if currentVersion === latestVersion", () => {
      vc = new VersionCheck(testVersion);
      const canNotifyUser = vc.canNotifyUser();

      assert.strictEqual(
        canNotifyUser,
        false,
        "Version Check will notify if currentVersion === latestVersion."
      );
    });
    it("false if typeof currentVersion !== string", () => {
      vc = new VersionCheck("");
      const canNotifyUser = vc.canNotifyUser();

      assert.strictEqual(
        canNotifyUser,
        false,
        "Version Check will notify if typeof currentVersion !== string."
      );
    });
    it("false if lastVersionLogged === latestVersion", () => {
      vc.alreadyLoggedLatestVersion = () => true;

      const canNotifyUser = vc.canNotifyUser();

      assert.strictEqual(
        canNotifyUser,
        false,
        "Version Check will notify if alreadyLoggedLatestVersion is true."
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
      vc.alreadyLoggedLatestVersion = () => false;

      let canNotifyUser = vc.canNotifyUser();

      assert.strictEqual(
        canNotifyUser,
        true,
        "canNotifyUser returns false when notificationInterval has passed."
      );

      vc._config.lastNotification = new Date().getTime();
      canNotifyUser = vc.canNotifyUser();

      assert.strictEqual(
        canNotifyUser,
        false,
        "canNotifyUser returns true when notificationInterval has not passed."
      );
    });

    it("true if currentVersion is a valid semver < latestVersion that has not been previously logged to the user", () => {
      const currentVersion = "0.0.1";
      const config = {
        latestVersion: "1.0.0",
        enabled: true,
        disableInCI: false
      };
      vc = new VersionCheck(currentVersion, config);
      vc.alreadyLoggedLatestVersion = () => false;

      const canNotifyUser = vc.canNotifyUser();

      assert.strictEqual(
        canNotifyUser,
        true,
        "Version Check will not notify if checks pass."
      );
    });
  });

  describe("alreadyLoggedLatestVersion", () => {
    it("true if config.lastVersionLogged < latestVersion", () => {
      const config = {
        lastVersionLogged: "0.0.0",
        latestVersion: "1.0.0",
        disableInCI: false
      };
      vc = new VersionCheck("0.0.0", config);

      assert.strictEqual(
        vc.alreadyLoggedLatestVersion(),
        false,
        "alreadyLoggedLatestVersion is true when lastVersionLogged < latestVersion."
      );
    });
    it("false if config.lastVersionLogged = latestVersion", () => {
      const config = {
        lastVersionLogged: "1.0.0",
        latestVersion: "1.0.0",
        disableInCI: false
      };
      vc = new VersionCheck("0.0.0", config);

      assert.strictEqual(
        vc.alreadyLoggedLatestVersion(),
        true,
        "alreadyLoggedLatestVersion is false when lastVersionLogged = latestVersion."
      );
    });
    it("false if config.lastVersionLogged > latestVersion", () => {
      const config = {
        lastVersionLogged: "2.0.0",
        latestVersion: "1.0.0",
        disableInCI: false
      };
      vc = new VersionCheck("0.0.0", config);

      assert.strictEqual(
        vc.alreadyLoggedLatestVersion(),
        true,
        "alreadyLoggedLatestVersion is false when lastVersionLogged > latestVersion."
      );
    });
  });

  describe("cliMessage", () => {
    let options: VersionCheckOptions;
    const currentVersion: string = "1.2.3";

    beforeEach(() => {
      options = {
        packageName: "ganache",

        latestVersion: "3.2.1",
        disableInCI: false
      };

      vc = new VersionCheck(
        currentVersion,
        { latestVersion: options.latestVersion },
        testLogger
      );
      message = "";
    });

    it("will not generate a log message if semver is the same between currentVersion and latestVersion", () => {
      vc = new VersionCheck(
        currentVersion,
        {
          latestVersion: currentVersion
        },
        testLogger
      );

      const didLog = !!vc.cliMessage();

      assert.strictEqual(
        didLog,
        false,
        "VC will log if currentVersion === latestVersion."
      );
    });

    it("logs a single line with the currentVersion and latestVersion", () => {
      vc = new VersionCheck(
        currentVersion,
        { latestVersion: options.latestVersion },
        testLogger
      );
      const message = vc.cliMessage();

      assert.strictEqual(
        message.indexOf(currentVersion) >= 0,
        true,
        "cliMessage does not contain the currentVersion."
      );
      assert.strictEqual(
        message.indexOf(options.latestVersion) >= 0,
        true,
        "cliMessage does not contain the latestVersion."
      );
    });

    it("logs regardless of whether VersionCheck is enabled", () => {
      vc.disable();

      const didLog = !!vc.cliMessage();

      assert.strictEqual(
        didLog,
        true,
        "cliMessage, incorrectly, does not log when VC is disabled."
      );
    });
    it("does not log if _currentVersion is undefined", () => {
      vc = new VersionCheck("Bad Version");

      const didLog = !!vc.cliMessage();

      assert.strictEqual(didLog, false, "cliMessage logs .");
    });
  });

  describe("log", () => {
    it("will not log if disabled", () => {
      vc.disable();

      vc.performVersionCheckAndOutputBanner();

      assert.strictEqual(message, "", "Version Check will log if disabled.");
    });
    it("will not log if currentVersion !== semver", () => {
      vc = new VersionCheck("DEV", { disableInCI: false }, testLogger);
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
      testConfig.lastVersionLogged = "0.0.0";
      vc = new VersionCheck(testVersion, testConfig, testLogger);
      vc.performVersionCheckAndOutputBanner();

      assert.strictEqual(
        message.indexOf(testVersion) >= 0,
        true,
        "Log does not contain currentVersion."
      );
      assert.strictEqual(
        testConfig.latestVersion &&
          message.indexOf(testConfig.latestVersion) >= 0,
        true,
        "Log does not contain latestVersion."
      );
    });
    it("reports on the config.packageName", () => {
      vc.performVersionCheckAndOutputBanner();

      assert.strictEqual(
        testConfig.packageName && message.indexOf(testConfig.packageName) >= -1,
        true,
        "Log does not contain the packageName."
      );
    });
    it("reports the upgradeType based on semverUpgradeType", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);

      const upgradeType = semverUpgradeType(
        testVersion,
        testConfig.latestVersion as string
      );
      vc.performVersionCheckAndOutputBanner();

      assert.strictEqual(
        upgradeType && message.indexOf(upgradeType) >= 0,
        true,
        "Log does not contain the correct upgradeType."
      );
    });
    it("logs the message", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);

      vc.performVersionCheckAndOutputBanner();

      assert.strictEqual(
        message.length > 0,
        true,
        "Log does not display the message."
      );
    });
    it("sets the latest version", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);

      assert.notStrictEqual(
        vc._config.lastVersionLogged,
        testConfig.latestVersion,
        "latestVersion and lastVersionLogged is the same before logging."
      );

      vc.performVersionCheckAndOutputBanner();

      assert.strictEqual(
        vc._config.lastVersionLogged,
        testConfig.latestVersion,
        "lastVersionLogged was not successfully set after logging version message."
      );
    });
    it("sets lastNotification", async () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);

      assert.notStrictEqual(
        vc._config.lastVersionLogged,
        testConfig.latestVersion,
        "latestVersion and lastVersionLogged is the same before logging."
      );

      const firstNotification = vc._config.lastNotification;

      vc.performVersionCheckAndOutputBanner();

      const secondNotification = vc._config.lastNotification;

      assert.strictEqual(
        secondNotification > firstNotification,
        true,
        "lastVersionLogged was not successfully set after logging version message."
      );
    });
    it("only logs the latestVersion one time", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);

      vc.performVersionCheckAndOutputBanner();

      assert.strictEqual(
        message.length > 0,
        true,
        "Log did not log the first time for this version."
      );
      message = "";
      vc.performVersionCheckAndOutputBanner();

      assert.strictEqual(message, "", "logged the same version message twice.");
    });

    it("message contains the upgradeType", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);
      vc.performVersionCheckAndOutputBanner();

      const upgradeType = semverUpgradeType(
        vc._currentVersion,
        vc._config.latestVersion
      );

      assert.strictEqual(
        upgradeType && message.indexOf(upgradeType) >= 0,
        true,
        "Message does not contain the upgradeType."
      );
    });

    it("message contains the packageName", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);
      vc.performVersionCheckAndOutputBanner();

      assert.strictEqual(
        message.indexOf(vc._config.packageName) >= 0,
        true,
        "Message does not contain the packageName."
      );
    });
    it("message contains the currentVersion", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);
      vc.performVersionCheckAndOutputBanner();

      assert.strictEqual(
        message.indexOf(vc._currentVersion) >= 0,
        true,
        "Message does not contain the currentVersion."
      );
    });
    it("message contains the latestVersion", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);
      vc.performVersionCheckAndOutputBanner();

      assert.strictEqual(
        message.indexOf(vc._config.latestVersion) >= 0,
        true,
        "Message does not contain the latestVersion."
      );
    });
    it("process.stdout.columns === -1", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);
      const oldColumns = process.stdout.columns;
      process.stdout.columns = -1;

      vc.performVersionCheckAndOutputBanner();
      process.stdout.columns = oldColumns;
      assert.strictEqual(message.length > 0, true, "Message did not log.");
    });
    it("process.stdout.columns === 0", () => {
      vc = new VersionCheck(testVersion, testConfig, testLogger);
      const oldColumns = process.stdout.columns;
      process.stdout.columns = 0;

      vc.performVersionCheckAndOutputBanner();
      process.stdout.columns = oldColumns;
      assert.strictEqual(message.length > 0, true, "Message did not log.");
    });
  });

  describe("getLatestVersion/_fetchLatest", () => {
    let api;
    const apiResponse = "1.0.0";
    const apiSettings = {
      port: 4000
    };
    const sleep = milliseconds => {
      return new Promise(resolve => setTimeout(resolve, milliseconds));
    };

    beforeEach(() => {
      api = http2.createServer();
      api.on("error", err => console.error(err));

      api.on("stream", async (stream, headers) => {
        const path = headers[":path"];
        const method = headers[":method"];

        if (method !== "GET") {
          stream.respond({
            ":status": 404
          });
          stream.end();
        }
        switch (path) {
          case "/version?package=ganache":
            if (stream.closed) return;
            stream.respond({
              ":status": 200
            });
            stream.write(apiResponse);
            stream.end();
            break;
          default:
            await sleep(10);
            stream.respond({
              ":status": 404
            });
            stream.end();
            break;
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
      if (api) {
        api.close();
      }
    });
    it("will not getLatestVersion if version check is disabled", async () => {
      vc.disable();

      await vc.getLatestVersion();

      const { latestVersion } = vc.getConfig();

      assert.strictEqual(
        latestVersion,
        testVersion,
        "Version Check will _fetchLatest if disabled."
      );
    });

    it("fetches the latest version from the API", async () => {
      let latestVersion;

      latestVersion = await vc._fetchLatest();

      assert.strictEqual(
        latestVersion === apiResponse,
        true,
        "latestVersion does not match apiResponse."
      );
    });
    /*
    This will only ever cause intermittent failures in mocha on mac.
    it("When the ttl expires, throw and cancel the request", async () => {
      const ttl = 1;

      vc = new VersionCheck(
        testVersion,
        {
          enabled: true,
          url: "http://localhost:" + apiSettings.port,
          packageName: "slow",
          ttl
        },
        testLogger
      );

      let errorMessage;
      try {
        await vc._fetchLatest();
      } catch (e) {
        errorMessage = e;
      }

      assert.strictEqual(errorMessage, `ttl expired: ${ttl}`);
    });
*/
    it("fetches the latest version and sets it in the config file.", async () => {
      await vc.getLatestVersion();

      const latestVersion = vc._config.latestVersion;

      assert.strictEqual(
        latestVersion,
        apiResponse,
        "latestVersion is not correctly set in _config after getLatestVersion."
      );
    });
  });

  describe("destroy", () => {
    it("sets _request and _session to null", () => {
      vc.destroy();

      assert.strictEqual(vc._request, null, "_request is not destroyed.");
      assert.strictEqual(vc._session, null, "_session is not destroyed.");
    });
  });

  describe("notificationIntervalHasPassed", () => {
    it("returns true if the notificationInterval has passed", () => {
      const hasPassed = vc.notificationIntervalHasPassed();
      assert.strictEqual(
        hasPassed,
        true,
        "Notification interval has passed but hasPassed is false."
      );
    });
    it("returns false if the notificationInterval has passed", () => {
      const lastNotification = Date.now();

      vc = new VersionCheck(testVersion, { lastNotification }, testLogger);

      const hasPassed = vc.notificationIntervalHasPassed();
      assert.strictEqual(
        hasPassed,
        false,
        "Notification interval has not passed but hasPassed is true."
      );
    });
  });
});
