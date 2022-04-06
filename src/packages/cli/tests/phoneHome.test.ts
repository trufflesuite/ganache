import assert from "assert";
import nock from "nock";
import sinon from "sinon";
import phoneHome from "../src/phoneHome/phoneHome";

describe("@ganache/cli/phoneHome", () => {
  let scope, spy;
  const phoneHomeSettings = {
    hostname: "https://version.trufflesuite.com",
    port: 443,
    path: "/?name=ganache",
    method: "GET",
    headers: { "User-Agent": `Ganache TEST` }
  };
  const testVersion = "0.0.1";
  const incorrectVersion = "TEST";

  const incorrectVersionMessage = `Current Ganache version is: ${incorrectVersion}, latest version: ${testVersion}, please upgrade Ganache`;
  const devVersionMessage =
    "Ganache running in DEV mode, will not phoneHome version check";

  beforeEach(() => {
    spy = sinon.spy(console, "log");
    scope = nock(phoneHomeSettings.hostname)
      .get(phoneHomeSettings.path)
      .reply(200, testVersion);
  });
  afterEach(() => {
    spy.restore();
    nock.cleanAll();
  });

  describe("", () => {
    it("exits DEV versions early", async () => {
      assert.equal(await phoneHome("DEV"), false);
    });

    it("exits if this version of Ganache was already checked");

    describe("Phone home versions do not match", () => {
      it("warns user when version is incorrect", async () => {
        await phoneHome(incorrectVersion);
        assert(spy.calledWith(incorrectVersionMessage));
      });

      it("returns false when version is incorrect", async () => {
        assert.equal(await phoneHome(incorrectVersion), false);
      });
    });
    describe("Phone home versions match", () => {
      it("returns true", async () => {
        assert.equal(await phoneHome(testVersion), true);
        assert.equal(spy.callCount, 0);
      });
    });
  });
  describe("Request timeouts", () => {
    beforeEach(() => {
      nock.cleanAll();
      scope = nock(phoneHomeSettings.hostname)
        .get(phoneHomeSettings.path)
        .reply(504, undefined);
    });

    afterEach(() => {
      nock.cleanAll();
    });

    it("fails silently", async () => {
      assert.equal(await phoneHome(testVersion), false);
    });
  });
  describe("Request errors", () => {
    beforeEach(() => {
      nock.cleanAll();
      scope = nock(phoneHomeSettings.hostname)
        .get(phoneHomeSettings.path)
        .replyWithError({
          message: "AWFUL WAFFLE",
          code: "ZEKE_THE_PLUMBER"
        });
    });

    afterEach(() => {
      nock.cleanAll();
    });

    it("fails silently", async () => {
      assert.equal(await phoneHome(testVersion), false);
    });
  });
});
