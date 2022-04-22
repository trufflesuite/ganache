import assert from "assert";
import VersionChecker from "../src/";
import * as fs from "fs";
import { Version } from "../../flavors/node_modules/@ganache/filecoin/typings/src/things/version";

process.env.TEST = "true";

describe("@ganache/version-check", () => {
  let vc;
  const testVersion = "0.0.0-test";
  const testConfig = {
    packageName: "test",
    enabled: true,
    url: "test",
    ttl: 100,
    latestVersion: "99.99.99",
    latestVersionLogged: "99.99.99",
    lastCheck: 100
  };
  beforeEach(() => {
    vc = new VersionChecker(testVersion);
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

      console.log(vc._config);

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
      vc = new VersionChecker("0.0.0");
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
    /*
      1. Latest > than current
      2. Latest === current
      3. Latest < current 
    */
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

  describe("shouldUpgrade", () => {
    it("returns false if current version is not defined");
    it("returns false if current version is in DEV mode");
    it("returns false if current version === latest version");
    it("returns false if current version is not a string");
    it("returns false if current version is a zero length string");
    it("returns falsy if upgradeIsAvailable not detected");
    it("returns upgrade type if upgradeIsAvailable");
  });
});
