import assert from "assert";
import VersionChecker from "../src/";
import * as fs from "fs";
import { Version } from "../../flavors/node_modules/@ganache/filecoin/typings/src/things/version";

process.env.TEST = "true";

describe("@ganache/version-check", () => {
  let vc;

  beforeEach(() => {
    vc = new VersionChecker();
  });

  afterEach(() => {
    const testConfigFileLocation = vc.configFileLocation(); // process.env.TEST is set above
    fs.unlinkSync(testConfigFileLocation);
  });

  describe("constructor", () => {
    it("instantiates with the default config", () => {
      const { config } = VersionChecker.DEFAULTS;

      assert.deepStrictEqual(
        vc._config,
        config,
        "Default Config values do not match newly created version checker"
      );
    });
    it("sets the current version", () => {
      const testVersion = "0.0.0-test";

      vc = new VersionChecker(null, testVersion);
      assert(vc._currentVersion === testVersion, "");
    });
    it("sets a logger", () => {
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
    it("sets a new package name");
    it("sets a new url endpoint");
    it("sets a ttl");
    it("sets enabled to true/false");
    it("sets the latest version");
    it("sets the last version logged to the user");
  });

  describe("detectSemverChange", () => {
    it("detects patches");
    it("detects minor changes");
    it("detects major changes");
    it("prioritizes minor over patch");
    it("prioritizes major over patch");
    it("prioritizes major over minor");
    it("returns null for latest.major < current.major");
    it(
      "returns null for latest.minor < current.minor when latest.major >= current.major"
    );
    it(
      "returns null for latest.patch < current.patch when latest.major.minor >= current.major.minor"
    );
    it("returns null for current === latest");
    it("returns null for invalid current semver");
    it("returns null for invalid latest semver");
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
