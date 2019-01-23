const assert = require("assert");
const Ganache = require("../index.js");
const request = require("request");
const pify = require("pify");

const customRequestHeader = "X-PINGOTHER";

function test(host, port) {
  describe("CORS", () => {
    it("should set request headers equals to response headers in a preflight request", (done) => {
      let req = request.options(
        {
          url: "http://" + host + ":" + port,
          headers: {
            "Access-Control-Request-Headers": customRequestHeader,
            "Access-Control-Request-Method": "POST",
            "Origin": "https://localhost:3000"
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

    it("should return an error message if the OPTIONS request is not a valid preflight request.", (done) => {
      let origin = "https://localhost:3000";
      let req = request.options(
        {
          url: "http://" + host + ":" + port,
          headers: {
            "Origin": origin
          }
        },
        function(error, response) {
          if (error) {
            return done(error);
          }

          assert.strictEqual(
            response.statusCode,
            400,
            "A an OPTIONS request that isn't a preflight request should return an error."
          );

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
            "Origin": origin
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
        });

      req.destroy();
    });

    it("should set Access-Control-Allow-Credentials=true if the Origin is set.", (done) => {
      let origin = "https://localhost:3000";
      let req = request.options(
        {
          url: "http://" + host + ":" + port,
          headers: {
            "Origin": origin
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
