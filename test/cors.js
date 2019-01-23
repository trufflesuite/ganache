const assert = require("assert");
const Ganache = require("../index.js");
const request = require("request");
const pify = require("pify");

const customRequestHeader = "X-PINGOTHER";

function test(host, port) {
  describe("CORS", () => {
    it("should request headers equals to response headers in a preflight request", (done) => {
      let req = request.options(
        {
          url: "http://" + host + ":" + port,
          headers: {
            "Access-Control-Request-Headers": customRequestHeader
          }
        },
        function(error, response) {
          if (error) {
            return done(error);
          }

          let allowHeader = "";

          if (response.headers.hasOwnProperty("access-control-allow-headers")) {
            allowHeader = response.headers["access-control-allow-headers"];
          }

          assert.strictEqual(
            allowHeader,
            customRequestHeader,
            "Access-Control-Allow-Headers should be equals to Access-Control-Request-Headers"
          );

          done();
        }
      );

      req.destroy();
    });
  });
}

describe("HTTP Server:", function() {
  const host = "localhost";
  const port = 12345;
  let server;

  before("Initialize Ganache server", async function() {
    server = Ganache.server();
    await pify(server.listen)(port);
  });

  after("Shutdown server", async function() {
    await pify(server.close)();
  });

  test(host, port);
});
