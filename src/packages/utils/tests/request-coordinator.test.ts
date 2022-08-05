import assert from "assert";
import { RequestCoordinator } from "../src/utils/request-coordinator";

describe("request-coordinator", () => {
  const noop = () => undefined;
  let coordinator: RequestCoordinator;

  beforeEach("instantiate RequestCoordinator", () => {
    coordinator = new RequestCoordinator(0);
  });

  describe("stop()", () => {
    it("should pause processing", () => {
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
        coordinator.queue(noop, this, []),
        new Error("Cannot process request, Ganache is disconnected.")
      );
    });
  });

  describe("rejectAllPendingRequests()", () => {
    it("should reject pending requests in the order that they were received", async () => {
      coordinator.pause();

      let taskIndex = 0;
      const pendingAssertions: Promise<any>[] = [];
      for (let i = 0; i < 10; i++) {
        const task = coordinator.queue(noop, this, []);

        let nextRejectionIndex = taskIndex;
        pendingAssertions.push(task.catch(_ => {
          assert.strictEqual(i, nextRejectionIndex, `Rejected in incorrect order, waiting on task at index ${nextRejectionIndex}, got ${i}.`);
        }));

        taskIndex++;

        pendingAssertions.push(assert.rejects(task, new Error("Cannot process request, Ganache is disconnected.")));
      }

      coordinator.rejectPendingTasks();
      await Promise.all(pendingAssertions);

      assert.equal(coordinator.pending.length, 0, "Coordinator pending list should be empty");
    });

    it("should clear the pending tasks queue", () => {
      coordinator.pause();

      for (let i = 0; i < 10; i++) {
        coordinator.queue(noop, this, []);
      }

      assert.equal(coordinator.pending.length, 10, "Incorrect pending queue length before calling rejectAllPendingRequests");

      coordinator.rejectPendingTasks();
      assert.equal(coordinator.pending.length, 0, "Incorrect pending queue length after calling rejectAllPendingRequests");
    });
  });
});
