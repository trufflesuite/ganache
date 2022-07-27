import assert from "assert";
import { RequestCoordinator } from "../src/utils/request-coordinator";

describe("request-coordinator", () => {
  let coordinator: RequestCoordinator;

  beforeEach("instantiate RequestCoordinator", () => {
    coordinator = new RequestCoordinator(0);
  });

  describe("disconnect", () => {
    it("should pause processing", () => {
      coordinator.disconnect();

      assert(coordinator.paused);
    });

    it("should not allow processing to be resumed", () => {
      coordinator.disconnect();

      assert.throws(
        () => coordinator.resume(),
        new Error("Cannot resume processing requests, Ganache is disconnected.")
      );
    });

    it("should not allow new requests to be queued", async () => {
      coordinator.disconnect();

      await assert.rejects(
        coordinator.queue(() => null, this, []),
        new Error("Cannot process request, Ganache is disconnected.")
      );
    });

    it("should reject all queued requests", async () => {
      const neverEndingTask = () => {
        return new Promise(() => {});
      };
      const taskPromise = coordinator.queue(neverEndingTask, this, []);
      coordinator.disconnect();
      await assert.rejects(
        taskPromise,
        new Error("Cannot process request, Ganache is disconnected.")
      );
    });
  });
});
