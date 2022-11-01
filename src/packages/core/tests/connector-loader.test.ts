import assert from "assert";
import { loadConnector } from "../src/connector-loader";

describe("connector-loader", () => {
  describe("initialize", () => {
    it("the returned promise should reject, if disconnect() is called before the provider is ready", async () => {
      const { promise, connector } = loadConnector({});
      connector.provider.disconnect();

      // This assertion ensures that the "stopped" queue() method that is
      // assigned in request-coordinator.stop() is called correctly.
      await assert.rejects(
        promise,
        new Error("Cannot resume processing requests, Ganache is disconnected.")
      );
    });
  });
});
