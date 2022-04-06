import assert from "assert";
import { getLatestVersionNumber, logIfUpgradeRequired } from "../src/";

describe("@ganache/version-check", () => {
  it("works", async () => {
    const version = await getLatestVersionNumber("ganache");
    assert.strictEqual(version.split(".").length, 3);
  });
  it("logs", () => {
    const logged = logIfUpgradeRequired({ name: "ganache", logger: console, current: "7.0.3", latest: "8.0.5" });
    assert.strictEqual(logged, true);
  })
});
