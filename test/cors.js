const assert = require("assert");
const Ganache = require("../index.js");
const request = require("request");
const pify = require("pify");

const customRequestHeader = "X-PINGOTHER";

function test(host, port) {
  describe("CORS", () => {
    it("should set response headers correctly in a preflight request", (done) => {
      let req = request.options(
        {
          url: "http://" + host + ":" + port,
          headers: {
            "Access-Control-Request-Headers": customRequestHeader,
            // delete isn't supported by ganache.server, but we want to test that
            // we respond with the headers we do support (POST)
            "Access-Control-Request-Method": "DELETE",
            Origin: "https://localhost:3000"
          }
        },
        function(error, response) {
          if (error) {
            return done(error);
          }

          const allowHeader = response.headers["access-control-allow-headers"];
          const methodHeader = response.headers["access-control-allow-methods"];
          const contentLengthHeader = response.headers["content-length"];
          const statusCode = response.statusCode;

          assert.strictEqual(
            allowHeader,
            customRequestHeader,
            "Access-Control-Allow-Headers should be equals to Access-Control-Request-Headers"
          );
          assert.strictEqual(methodHeader, "POST", "Access-Control-Allow-Methods should be equals to 'POST'");
          assert.strictEqual(
            contentLengthHeader,
            "0",
            "Content-Length header should be equal to 0 for browser compatibility reasons"
          );
          assert.strictEqual(statusCode, 204, "response.statusCode should be '204'");

          done();
        }
      );

      req.destroy();
    });

    it("should set response.Access-Control-Allow-Origin to equal request.Origin if request.Origin is set", (done) => {
      let origin = "https://localhost:3000";
      let req = request.options(
        {
          url: "http://" + host + ":" + port,
          headers: {
            Origin: origin,
            "Access-Control-Request-Method": "POST"
          }
        },
        function(error, response) {
          if (error) {
            return done(error);
          }

          let accessControlAllowOrigin = "";

          if (response.headers.hasOwnProperty("access-control-allow-origin")) {
            accessControlAllowOrigin = response.headers["access-control-allow-origin"];
          }

          assert.strictEqual(
            accessControlAllowOrigin,
            origin,
            "response.Access-Control-Allow-Origin should equal request.Origin if request.Origin is set."
          );

          done();
        }
      );

      req.destroy();
    });

    it("should set Access-Control-Allow-Credentials=true if the Origin is set.", (done) => {
      let origin = "https://localhost:3000";
      let req = request.options(
        {
          url: "http://" + host + ":" + port,
          headers: {
            Origin: origin,
            "Access-Control-Request-Method": "POST"
          }
        },
        function(error, response) {
          if (error) {
            return done(error);
          }

          assert.strictEqual(
            response.headers["access-control-allow-credentials"],
            "true",
            "response.Access-Control-Allow-Origin should equal request.Origin if request.Origin is set."
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
