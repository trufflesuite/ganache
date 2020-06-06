import assert from "assert";
import getProvider from "../../helpers/getProvider";

describe("api", () => {
  describe("net", () => {;
    it("net_version", async () => {
      const roundedTo5Seconds = (num: number) => Math.round(num / 5000) * 5000;
      const nowIsh = roundedTo5Seconds(Date.now());
      const provider = await getProvider();
      const netVersion = await provider.request("net_version");
      assert.strictEqual(roundedTo5Seconds(netVersion), nowIsh);
    });

    it("net_listening", async () => {
      const provider = await getProvider();
      const netListening = await provider.request("net_listening");
      assert.strictEqual(netListening, true);
    });

    it("net_peerCount", async () => {
      const provider = await getProvider();
      const peerCount = await provider.request("net_peerCount");
      assert.strictEqual(peerCount, "0x0");
    });
  });
});
