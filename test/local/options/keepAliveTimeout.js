const testTimeout = require("./lib/testTimeout");

describe("options:keepAliveTimeout", function() {
  it("should timeout", async function() {
    await testTimeout(2000, 1000, "timeout should have destroyed socket");
  })
    .timeout(2500)
    .slow(1500);

  it("shouldn't timeout", async function() {
    await testTimeout(1000, 2000, "timeout should not have destroyed socket");
  })
    .timeout(2500)
    .slow(3000);
});
