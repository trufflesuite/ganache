import assert from "assert";
import { getLatestVersionNumber, logIfUpgradeRequired } from "../src/";

describe("@ganache/version-check", () => {
  it("works", async () => {
    const version = await getLatestVersionNumber("ganache");
    assert.strictEqual(version.split(".").length, 3);
  });
  it("logs", () => {
    const logged = logIfUpgradeRequired({
      name: "ganache",
      logger: console,
      current: "7.0.3",
      latest: "8.0.5"
    });
    assert.strictEqual(logged, true);
  });

  describe("constructor", () => {
    it("has a default config");
    it("can set the configName to ganache/truffle");
    it("sets the current version");
    it("sets a logger");
  });

  describe("config setters", () => {
    it("sets a new url endpoint");
    it("sets a ttl");
    it("sets enabled to true/false");
    it("sets the latest version");
  });

  describe("detectSemverChange", () => {
    it("detects patches");
    it("detects minor changes");
    it("detects major changes");
    it("prioritizes minor over patch");
    it("prioritizes major over patch");
    it("prioritizes major over minor");
    it("returns null for invalid current semver");
    it("returns null for invalid latest semver");
  });

  describe("updateIsAvailable", () => {
    it("returns false if current version is not defined");
    it("returns false if current version is in DEV mode");
    it("returns false if current version === latest version");
    it("returns false if current version is not a string");
    it("returns false if current version is a zero length string");
    it("returns falsy if upgradeIsAvailable not detected");
    it("returns true if upgradeIsAvailable");
  });
});
