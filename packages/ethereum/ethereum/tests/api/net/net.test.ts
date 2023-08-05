import assert from "assert";
import getProvider from "../../helpers/getProvider";

describe("api", () => {
  describe("net", () => {
    it("net_version", async () => {
      const roundedTo5Seconds = (num: number) => Math.round(num / 5000) * 5000;
      const nowIsh = roundedTo5Seconds(Date.now());
      const provider = await getProvider();
      const netVersion = await provider.send("net_version");
      assert.strictEqual(roundedTo5Seconds(parseInt(netVersion, 10)), nowIsh);
    });

    it("net_listening", async () => {
      const provider = await getProvider();
      const netListening = await provider.send("net_listening");
      assert.strictEqual(netListening, true);
    });

    it("net_peerCount", async () => {
      const provider = await getProvider();
      const peerCount = await provider.send("net_peerCount");
      assert.strictEqual(peerCount, "0x0");
    });
  });
});
