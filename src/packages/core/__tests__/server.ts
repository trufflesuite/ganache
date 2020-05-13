import Ganache from "../src";
import * as assert from "assert";
import request from "superagent";
import WebSocket from "ws";
import Server, {Status} from "../src/server";
import ServerOptions from "../src/options/server-options";
import http from "http";
import intoStream from "into-stream";
import EthereumProvider from "@ganache/ethereum/src/provider";
import PromiEvent from "@ganache/utils/src/things/promievent";
import {promisify} from "util";

const IS_WINDOWS = process.platform === "win32";

describe("server", () => {
  const port = 5234;
  const network_id = "1234";
  const jsonRpcJson: any = {
    jsonrpc: "2.0",
    id: "1",
    method: "net_version",
    params: []
  };
  const logger = {
    log: (_message: string) => {}
  };
  let s: Server;
  async function setup(
    options = {
      network_id,
      logger
    } as ServerOptions
  ) {
    s = Ganache.server(options);
    return s.listen(port);
  }
  async function teardown() {
    if (s && s.status & Status.open) {
      await s.close();
    }
  }
  describe("http", () => {
    async function simpleTest() {
      const response = await request.post("http://localhost:" + port).send(jsonRpcJson);
      assert.strictEqual(response.status, 200);

      const json = JSON.parse(response.text);
      assert.strictEqual(json.result, network_id);
      return response;
    }

    it("returns its status", async () => {
      const s = Ganache.server();
      try {
        assert.strictEqual(s.status, Status.closed);
        const pendingListen = s.listen(port);
        assert.strictEqual(s.status, Status.opening);
        assert.ok(s.status & Status.opening, "Bitmask broken: can't be used to determine `open || closed` state");
        await pendingListen;
        assert.strictEqual(s.status, Status.open);
        assert.ok(s.status & Status.open, "Bitmask broken: can't be used to determine `open || closed` state");
        const pendingClose = s.close();
        assert.strictEqual(s.status, Status.closing);
        assert.ok(s.status & Status.closing, "Bitmask broken: can't be used to determine `closed || closing` state");
        await pendingClose;
        assert.strictEqual(s.status, Status.closed);
        assert.ok(s.status & Status.closed, "Bitmask broken: can't be used to determine `closed || closing` state");
      } catch (e) {
        // in case of failure, make sure we properly shut things down
        if (s.status & Status.open) {
          await s.close().catch(e => e);
        }
        throw e;
      }
    });

    it("returns the net_version", async () => {
      await setup();
      try {
        await simpleTest();
      } finally {
        await teardown();
      }
    });

    it("returns the net_version over a legacy-style connection listener", done => {
      s = Ganache.server({
        network_id
      } as ServerOptions);
      s.listen(port, async () => {
        try {
          await simpleTest();
        } finally {
          await teardown();
        }
        done();
      });
    });

    it("fails to `.listen()` twice, Promise", async () => {
      await setup();
      try {
        // the call to `setup()` above calls `listen()` already. if we call it
        // again it should fail.
        await assert.rejects(s.listen(port), {
          message: `Server is already open on port: ${port}.`
        });
      } finally {
        await teardown();
      }
    });

    it("fails to `.listen()` twice, Callback", async () => {
      await setup();
      try {
        // the call to `setup()` above calls `listen()` already. if we call it
        // again it should fail.
        const listen = promisify(s.listen.bind(s));
        await assert.rejects(listen(port), {
          message: `Server is already open on port: ${port}.`
        });
      } finally {
        await teardown();
      }
    });

    it("fails to `.close()` if server is closed", async () => {
      await setup();
      try {
        await s.close();
        assert.rejects(s.close(), {
          message: "Server is already closed or closing."
        });
      } finally {
        await teardown();
      }
    });

    it("fails to `.close()` if server is closed", async () => {
      await setup();
      try {
        s.close();
        assert.rejects(s.close(), {
          message: "Server is already closed or closing."
        });
      } finally {
        await teardown();
      }
    });

    it("fails to listen if the socket is already in use by 3rd party, Promise", async () => {
      const server = http.createServer();
      server.listen(port);

      try {
        await assert.rejects(setup, {
          message: `Failed to listen on port: ${port}.`
        });
      } finally {
        await teardown();
        server.close();
      }
    });

    it("fails to listen if the socket is already in use by 3rd party, Callback", async () => {
      const server = http.createServer();
      server.listen(port);

      try {
        const s = Ganache.server();
        const listen = promisify(s.listen.bind(s));
        await assert.rejects(listen(port), {
          message: `Failed to listen on port: ${port}.`
        });
      } finally {
        await teardown();
        server.close();
      }
    });

    // skip on Windows until https://github.com/uNetworking/uSockets/pull/101 is merged
    (IS_WINDOWS ? xit : it)("fails to listen if the socket is already in use by Ganache", async () => {
      await setup();
      const s2 = Ganache.server();

      try {
        await assert.rejects(s2.listen(port), {
          message: `Failed to listen on port: ${port}.`
        });
      } catch (e) {
        // in case of failure, make sure we properly shut things down
        if (s2.status & Status.open) {
          await s2.close().catch(e => e);
        }
        throw e;
      } finally {
        await teardown();
      }
    });

    it("rejects if listen called while server is closing, Promise", async () => {
      await setup();
      try {
        const closer = s.close();
        await assert.rejects(s.listen(4444), {
          message: "Cannot start server while it is closing."
        });
        await closer;
      } finally {
        await teardown();
      }
    });

    it("rejects if listen called while server is closing, Callback", async () => {
      await setup();
      try {
        const closer = s.close();
        const listen = promisify(s.listen.bind(s));
        await assert.rejects(listen(4444), {
          message: "Cannot start server while it is closing."
        });
        await closer;
      } finally {
        await teardown();
      }
    });

    it("rejects if close is called while opening", async () => {
      const pendingSetup = setup();
      try {
        await assert.rejects(s.close(), {
          message: "Cannot close server while it is opening."
        });
      } finally {
        await pendingSetup;
        await teardown();
      }
    })

    it("does not start a websocket server when `ws` is false", async () => {
      await setup({
        ws: false
      } as ServerOptions);
      try {
        const ws = new WebSocket("ws://localhost:" + port);

        await assert.rejects(
          new Promise((resolve, reject) => {
            ws.on("open", resolve);
            ws.on("error", reject);
          }),
          {
            message: "Unexpected server response: 400"
          }
        );
      } finally {
        await teardown();
      }
    });

    it("handles chunked requests (note: doesn't test `transfer-encoding: chunked`)", async () => {
      await setup();
      try {
        const req = request.post("http://localhost:" + port);
        const json = JSON.stringify(jsonRpcJson);

        // we have to set the content-length because we can't use
        // `Transfer-Encoding: chunked` with uWebSockets.js as of v15.9.0
        req.set("Content-Length", json.length.toString());

        await new Promise((resolve, reject) => {
          req.on("response", response => {
            const json = JSON.parse(response.text);
            assert.strictEqual(json.result, network_id);
            resolve();
          });
          req.on("error", () => {
            reject();
          });

          const readableStream = intoStream(json);
          // make sure the data is sent as tiny pieces.
          (readableStream as any)._readableState.highWaterMark = 8;
          readableStream.pipe(req as any);
        });
      } finally {
        await teardown();
      }
    });

    it("fails to subscribe over HTTP", async () => {
      await setup();
      const jsonRpcJson: any = {
        jsonrpc: "2.0",
        id: "1",
        method: "eth_subscribe",
        params: []
      };
      try {
        // TODO: should we expect a 200 OK response with an `error` property
        //  in a json rpc body? Probably, because we _do_ already send one. :-/
        await assert.rejects(request.post("http://localhost:" + port).send(jsonRpcJson), {
          status: 400,
          message: "Bad Request"
        });
      } finally {
        await teardown();
      }
    });

    it("returns a teapot", async () => {
      await setup();
      try {
        const result = await request.get("http://localhost:" + port + "/418").catch(e => e);
        assert.strictEqual(result.status, 418);
        assert.strictEqual(result.message, "I'm a Teapot");
      } finally {
        await teardown();
      }
    });

    it("returns 404 for bad routes", async () => {
      await setup();
      const methods: ["get", "post", "head", "options", "put", "delete", "patch", "trace"] = ["get", "post", "head", "options", "put", "delete", "patch", "trace"];
      try {
        const requests = methods.map(async method => {
          const result = await request[method]("http://localhost:" + port + "/there-is-no-spoon").catch((e: any) => e);
          assert.strictEqual(result.status, 404);
          assert.strictEqual(result.message, "Not Found");
        });
        await Promise.all(requests);
      } finally {
        await teardown();
      }
    });

    it("doesn't crash when the request is aborted while waiting for repsonse", async () => {
      await setup();

      try {
        const provider = s.provider as EthereumProvider;
        const oldRequest = provider.request;
        const req = request.post("http://localhost:" + port);
        const abortPromise = new Promise(resolve => {
          provider.request = () => {
            // abort the request object after intercepting the request
            req.abort();
            return new Promise(innerResolve => {
              // It takes 2 passes of the event loop to register the `abort`
              // server-side:
              setImmediate(setImmediate, () => {
                // resolve the `provider.send` to make sure the server can
                // handle _not_ responding to a request that has been aborted:
                innerResolve();
                // and finally, resolve the `abort` promise:
                resolve();
              });
            });
          };
        });
        const result = await req.send(jsonRpcJson).catch(e => e);
        assert.strictEqual(result.code, "ABORTED", "Response was not aborted");

        // wait for the server to react to the requesrt's `abort`
        await abortPromise;

        provider.request = oldRequest;

        // now make sure we are still up and running:
        await simpleTest();
      } finally {
        await teardown();
      }
    });

    it("server closes when told to", async () => {
      await setup();

      try {
        await s.close();
        const req = request.post("http://localhost:" + port);
        await assert.rejects(req.send(jsonRpcJson), {
          code: "ECONNREFUSED"
        });
      } finally {
        await teardown();
      }
    });

    describe("CORS", () => {
      const optionsHeaders = ["Access-Control-Allow-Methods", "Access-Control-Allow-Headers", "Access-Control-Max-Age"];
      const baseHeaders = ["Access-Control-Allow-Credentials", "Access-Control-Allow-Origin"];
      const allCorsHeaders = optionsHeaders.concat(baseHeaders);

      it("does not return CORS headers for non-CORS requests", async () => {
        await setup();
        try {
          const resp = await simpleTest();
          allCorsHeaders.forEach(header => {
            assert.strictEqual(
              resp.header[header.toLowerCase()],
              void 0,
              `Non-CORS response should not contain header ${header}`
            );
          });
        } finally {
          await teardown();
        }
      });

      it("returns only base CORS headers for post request with origin header", async () => {
        await setup();
        const origin = "origin";
        try {
          const resp = await request
            .post("http://localhost:" + port)
            .set("origin", origin)
            .send(jsonRpcJson);
          assert.strictEqual(resp.status, 200);
          assert.strictEqual(resp.header["access-control-allow-credentials"], "true");
          assert.strictEqual(resp.header["access-control-allow-origin"], origin);
          optionsHeaders.forEach(header => {
            assert.strictEqual(
              resp.header[header.toLowerCase()],
              void 0,
              `Non-CORS response should not contain header ${header}`
            );
          });
        } finally {
          await teardown();
        }
      });

      it("returns all CORS headers for request options request with origin header", async () => {
        await setup();
        const origin = "origin";
        try {
          const resp = await request
            .options("http://localhost:" + port)
            .set("origin", origin)
            .send(jsonRpcJson);
          assert.strictEqual(resp.status, 204);
          assert.strictEqual(resp.header["access-control-allow-methods"], "POST");
          assert.strictEqual(resp.header["access-control-allow-origin"], origin);
          assert.strictEqual(resp.header["access-control-max-age"], "600");
          assert.strictEqual(resp.header["content-length"], "0");
          assert.strictEqual(resp.header["access-control-allow-credentials"], "true");
          assert.strictEqual(resp.header["access-control-allow-origin"], origin);
        } finally {
          await teardown();
        }
      });

      it("echos Access-Control-Request-Headers for options request", async () => {
        await setup();
        const origin = "origin";
        const acrh = "origin, content-length, x-random";
        try {
          const resp = await request
            .options("http://localhost:" + port)
            .set("origin", origin)
            .set("Access-Control-Request-Headers", acrh)
            .send(jsonRpcJson);

          assert.strictEqual(resp.status, 204);
          assert.strictEqual(resp.header["access-control-allow-headers"], acrh);
        } finally {
          await teardown();
        }
      });
    });
  });

  describe("websocket", () => {
    beforeEach(setup);
    afterEach(teardown);

    it("returns the net_version over a websocket", async () => {
      const ws = new WebSocket("ws://localhost:" + port);

      const response: any = await new Promise(resolve => {
        ws.on("open", () => {
          ws.send(JSON.stringify(jsonRpcJson));
        });
        ws.on("message", resolve);
      });
      const json = JSON.parse(response);
      assert.strictEqual(json.result, network_id);
    });

    it("returns the net_version over a websocket as binary", async () => {
      const ws = new WebSocket("ws://localhost:" + port);
      const response: any = await new Promise(resolve => {
        ws.on("open", () => {
          const strToAB = (str: string) => new Uint8Array(str.split("").map(c => c.charCodeAt(0))).buffer;
          ws.send(strToAB(JSON.stringify(jsonRpcJson)));
        });
        ws.on("message", resolve);
      });
      assert.strictEqual(response.constructor, Buffer, "response doesn't seem to be a Buffer as expect");
      const json = JSON.parse(response);
      assert.strictEqual(json.result, network_id, "Binary data result is not as expected");
    });

    it("doesn't crash when sending bad data over http", async () => {
      await assert.rejects(request.post("http://localhost:" + port).send("This is _not_ pudding."), {
        message: "Bad Request"
      });

      const response = await request.post("http://localhost:" + port).send(jsonRpcJson);
      const json = JSON.parse(response.text);
      assert.strictEqual(json.result, network_id);
    });

    it("doesn't crash when sending bad data over websocket", async () => {
      const ws = new WebSocket("ws://localhost:" + port);
      const result: number = await new Promise(resolve => {
        ws.on("open", () => {
          ws.on("close", resolve);
          ws.send("What is it?");
        });
      });
      assert.strictEqual(result, 1002, "Did not receive expected close code 1002");
    });

    it("doesn't crash when the connection is closed while a request is in flight", async () => {
      const provider = s.provider as EthereumProvider;
      provider.request = async () => {
        // close our websocket after intercepting the request
        await s.close();
      };

      const ws = new WebSocket("ws://localhost:" + port);
      return new Promise((resolve, reject) => {
        ws.on("open", () => {
          // If we get a message that means things didn't get closed as they
          // should have OR they are closing too late for some reason and
          // this test isn't testing anything.
          ws.on("message", () => reject("Got a message when we shouldn't have!"));

          // make sure we leave enough time for things to crash if it does end
          // up crashing.
          ws.on("close", () => setImmediate(resolve));

          // The RPC request method doesn't matter since we're duck punching our
          // provider.send method anyway.
          ws.send(JSON.stringify(jsonRpcJson));
        });
      });
    });

    it("handles PromiEvent messages", async () => {
      const provider = s.provider as EthereumProvider;
      const message = "I hope you get this message";
      provider.request = () => {
        const promiEvent = new PromiEvent((resolve => {
          resolve("0xsubscriptionId");
          setImmediate(()=>promiEvent.emit("message", message));
        }));
        return promiEvent;
      };

      const ws = new WebSocket("ws://localhost:" + port);
      const result = await new Promise(resolve => {
        ws.on("open", () => {
          // If we get a message that means things didn't get closed as they
          // should have OR they are closing too late for some reason and
          // this test isn't testing anything.
          ws.on("message", (data) => {
            const {result} = JSON.parse(data.toString());
            // ignore the initial response
            if (result === "0xsubscriptionId") return;

            resolve(result);
          });

          const subscribeJson: any = {
            jsonrpc: "2.0",
            id: "1",
            method: "eth_subscribe",
            params: []
          };
          ws.send(JSON.stringify(subscribeJson));
        });
      });
      
      assert.strictEqual(result, message);
    });

    it("doesn't crash when the connection is closed while a subscription is in flight", async () => {
      const provider = s.provider as EthereumProvider;
      let promiEvent: PromiEvent<any>;
      provider.request = () => {
        promiEvent = new PromiEvent((resolve => {
          resolve("0xsubscriptionId");
        }));
        return promiEvent;
      };

      const ws = new WebSocket("ws://localhost:" + port);
      return new Promise((resolve, reject) => {
        ws.on("open", () => {
          // If we get a message that means things didn't get closed as they
          // should have OR they are closing too late for some reason and
          // this test isn't testing anything.
          ws.on("message", (data) => {
            if (JSON.parse(data.toString()).result === "0xsubscriptionId") {
              // close our websocket after intercepting the request
              s.close();
              // then attempt to send a message back right after closing:
              promiEvent.emit("message", "I hope you don't get this message");
              return;
            }
            // the above message should never be received
            reject("Got a subscription message when we shouldn't have!");
          });

          // make sure we leave enough time for things to crash if it does end
          // up crashing.
          ws.on("close", () => setImmediate(resolve));

          const subscribeJson: any = {
            jsonrpc: "2.0",
            id: "1",
            method: "eth_subscribe",
            params: []
          };
          ws.send(JSON.stringify(subscribeJson));
        });
      });
    });

    // I can't get backpressure working on Windows. It's not super important because we
    // don't actually handle backpressure anyway.
    (IS_WINDOWS ? xit : it)("can handle backpressure", async () => {
      {
        // create tons of data to force websocket backpressure
        const huge: any = {};
        for (let i = 0; i < 1e6; i++) huge["prop_" + i] = {i};
        (s.provider as EthereumProvider).request = async () => {
          return huge;
        };
      }

      const ws = new WebSocket("ws://localhost:" + port);
      const oldLog = logger.log;
      try {
        let gotBackpressure = false;
        // duck punch `logger.log` so we can intercept logs
        logger.log = (message: string) => {
          if (message.indexOf("WebSocket backpressure: ") === 0) {
            gotBackpressure = true;
          }
        };
        return await new Promise((resolve, reject) => {
          ws.on("open", () => {
            ws.on("message", _message => {
              if (gotBackpressure) {
                resolve();
              } else {
                reject(
                  new Error(
                    "Possible false positive: Didn't detect backpressure " +
                      " before receiving a message. Ensure `s.provider.send` is" +
                      " sending enough data."
                  )
                );
              }
            });

            // The RPC request method doesn't matter since we're duck punching
            // our provider.send method anyway.
            ws.send(JSON.stringify(jsonRpcJson));
          });
        });
      } finally {
        // put the original logger back so other tests that might rely on it
        // don't break.
        logger.log = oldLog;
      }
    }).timeout(5000);
  });
});
