import assert from "assert";
import { RequestCoordinator } from "../src/utils/request-coordinator";

describe("request-coordinator", () => {
  const thisArg = {};
  const paramsArg: [] = [];
  const noop = () => undefined;
  let coordinator: RequestCoordinator;

  beforeEach("instantiate RequestCoordinator", () => {
    coordinator = new RequestCoordinator(0);
  });

  describe("stop()", () => {
    it("should set `paused` property to `true`", () => {
      coordinator.stop();

      assert(coordinator.paused);
    });

    it("should not allow processing to be resumed", () => {
      coordinator.stop();

      assert.throws(
        () => coordinator.resume(),
        new Error("Cannot resume processing requests, Ganache is disconnected.")
      );
    });

    it("should not allow new requests to be queued", async () => {
      coordinator.stop();

      await assert.rejects(
        coordinator.queue(noop, thisArg, paramsArg),
        new Error("Cannot process request, Ganache is disconnected.")
      );
    });
  });

  describe("end()", () => {
    it("should reject pending requests in the order that they were received", async () => {
      coordinator.pause();

      let nextRejectionIndex = 0;
      const pendingAssertions: Promise<any>[] = [];

      for (let taskIndex = 0; taskIndex < 10; taskIndex++) {
        const task = coordinator.queue(noop, thisArg, paramsArg);

        pendingAssertions.push(
          task.catch(() => {
            assert.strictEqual(
              taskIndex,
              nextRejectionIndex,
              `Rejected in incorrect order, waiting on task at index ${nextRejectionIndex}, got ${taskIndex}.`
            );
            nextRejectionIndex++;
          })
        );

        pendingAssertions.push(
          assert.rejects(
            task,
            new Error("Cannot process request, Ganache is disconnected.")
          )
        );
      }

      coordinator.end();
      await Promise.all(pendingAssertions);

      assert.equal(
        coordinator.pending.length,
        0,
        "Pending array should be empty"
      );
    });

    it("should clear the pending tasks queue", () => {
      coordinator.pause();

      for (let i = 0; i < 10; i++) {
        coordinator.queue(noop, thisArg, paramsArg);
      }

      assert.equal(
        coordinator.pending.length,
        10,
        "Incorrect pending queue length before calling end()"
      );

      coordinator.end();
      assert.equal(
        coordinator.pending.length,
        0,
        "Incorrect pending queue length after calling end()"
      );
    });
  });
});
