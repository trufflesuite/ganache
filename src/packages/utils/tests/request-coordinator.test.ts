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

    it("should stop when tasks are queued", async () => {
      coordinator.queue(() => new Promise<void>(noop), this, []);
      await coordinator.stop();

      assert(coordinator.paused);
    });

    describe("should wait for in-flight tasks to complete before resolving", () => {
      it("when the task resolves", async () => {
        const inProgressTask = coordinator.queue(noop, this, []);
        coordinator.resume();

        let isStopped = false;
        const stopped = coordinator.stop().then(() => (isStopped = true));

        await inProgressTask;
        assert(
          !isStopped,
          "return result of RequestCoordinator.stop() resolved before the pending task completed"
        );

        await assert.doesNotReject(stopped);
      });

      it("when the task rejects", async () => {
        const inProgressTask = coordinator.queue(
          () => Promise.reject(),
          this,
          []
        );
        coordinator.resume();

        let isStopped = false;
        const stopped = coordinator.stop().then(() => (isStopped = true));

        // the promise returned from coordinator.queue will resolve, even though the underlying promise rejects
        await inProgressTask;
        assert(
          !isStopped,
          "return result of RequestCoordinator.stop() resolved before the pending task completed"
        );

        await assert.doesNotReject(stopped);
      });
    });

    it("should reject if called a second time", async () => {
      coordinator.stop();
      await assert.rejects(coordinator.stop(), new Error("Already stopped."));
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
        pendingAssertions.push(
          task.catch(_ => {
            assert.strictEqual(
              i,
              nextRejectionIndex,
              `Rejected in incorrect order, waiting on task at index ${nextRejectionIndex}, got ${i}.`
            );
          })
        );

        taskIndex++;

        pendingAssertions.push(
          assert.rejects(
            task,
            new Error("Cannot process request, Ganache is disconnected.")
          )
        );
      }

      coordinator.rejectPendingTasks();
      await Promise.all(pendingAssertions);

      assert.equal(
        coordinator.pending.length,
        0,
        "Incorrect pending queue length after calling rejectAllPendingRequests"
      );
    });
  });
});
