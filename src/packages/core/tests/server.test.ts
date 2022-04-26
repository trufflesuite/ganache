// Using `../index` instead of `../` is
// necessary as `..` will point to the `package.json`
// and point to `main` which uses `lib/index.js`
// instead of `index.ts` causing TS errors during
// construction due to missing private fields
import Ganache, { Server } from "../index";

import assert from "assert";
import request from "superagent";
import WebSocket from "ws";
import { ServerStatus } from "../src/server";
import { MAX_PAYLOAD_SIZE as WS_MAX_PAYLOAD_SIZE } from "../src/servers/ws-server";

import http from "http";
// https://github.com/sindresorhus/into-stream/releases/tag/v6.0.0
import intoStream = require("into-stream");
import { PromiEvent } from "@ganache/utils";
import { promisify } from "util";
import { ServerOptions } from "../src/options";
import { Connector, Provider as EthereumProvider } from "@ganache/ethereum";
import { NetworkInterfaceInfo, networkInterfaces } from 'os';

const IS_WINDOWS = process.platform === "win32";

describe("server", () => {
  const port = 5234;
  const networkId = 1234;
  const jsonRpcJson: any = {
    jsonrpc: "2.0",
    id: "1",
    method: "net_version",
    params: []
  };
  const logger = {
    log: (_message: string) => { }
  };
  let s: Server;

  const defaultOptions = {
    chain: {
      networkId
    },
    logging: {
      logger
    }
  }

  async function setup(
    options: ServerOptions = defaultOptions, host: string | null = null
  ) {
    // @ts-ignore - `s` errors if you run tsc and then test
    // because it tries to compare the built declaration file to
    // the TS file, causing missing #<var> private variables
    s = Ganache.server(options);
    await s.listen(port, host);
    return s;
  }

  async function teardown() {
    // if the server is opening or open, try to close it.
    if (s && (s.status & ServerStatus.openingOrOpen) !== 0) {
      await s.close();
    }
  }

  /**
   * Sends a post request to the server and returns the response.
   * @param address
   * @param port
   * @param json
   * @param agent
   * @returns
   */
  function post(host: string, port: number, json: any, agent?: any) {
    const data = JSON.stringify(json);
    // We use http.request instead of superagent because superagent doesn't
    // support the interface name in ipv6 addresses, and in GitHub Actions the
    // Mac tests would fail because one of the available ipv6 addresses
    // requires the interface name (`fe80::1%lo0`)
    const req = http.request({
      agent,
      method: "POST",
      protocol: "http:",
      host,
      port,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "content-length": Buffer.byteLength(data)
      }
    });
    let resolve: any;
    let reject: any;
    const deferred = new Promise<any>((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
    req.on("response", (res: http.IncomingMessage) => {
      let data = "";
      res
        .on("data", d => data += d.toString("utf8"))
        .on("end", () => resolve({ status: 200, body: JSON.parse(data) }));
    });
    req.on("error", (err) => reject(err));
    req.write(data);
    req.end();
    return deferred;
  }

  // skip this test unless in GitHub Actions, as this test iterates over
  // all available network interfaces and network interfaces on user
  // machines are unpredictible and may behave in ways that we don't care
  // about.
  (process.env.GITHUB_ACTION ? describe : describe.skip)("listen", function () {
    function getHost(info: NetworkInterfaceInfo, interfaceName: string) {
      // a link-local ipv6 address starts with fe80:: and _must_ include a "zone_id"
      if (info.family === "IPv6" && info.address.startsWith("fe80::")) {
        if (process.platform == "win32") {
          // on windows the zone_id is the scopeid
          return `${info.address}%${info.scopeid}`;
        } else {
          // on *nix the zone_id is the `interfaceName`
          return `${info.address}%${interfaceName}`;
        }
      } else {
        return info.address;
      }
    }

    function getNetworkInterfaces() {
      const interfaces = networkInterfaces();
      const validInterfaces = {} as typeof interfaces;
      Object.keys(interfaces).forEach(interfaceName => {
        // Mac has default VPN interfaces that can't be bound to or listened on.
        // These interfaces start with "utun". A "utun*" is a virtual interface
        // created by an application on macOS endpoints to interact with the
        // system.
        if (!interfaceName.startsWith("utun")) {
          validInterfaces[interfaceName] = interfaces[interfaceName];
        }
      });
      return validInterfaces;
    }

    it.only("listens on all interfaces by default", async () => {
      await setup();
      try {
        const interfaces = getNetworkInterfaces();
        assert(Object.keys(interfaces).length > 0);

        for (const interfaceName of Object.keys(interfaces)) {
          const interfaceInfo = interfaces[interfaceName];
          assert(interfaceInfo.length > 0);

          for (const info of interfaceInfo) {
            const host = getHost(info, interfaceName);
            console.log(host);
            const response = await post(host, port, jsonRpcJson);
            assert.strictEqual(response.status, 200, `Wrong status code when connecting to http://${host}:${port}`);
            assert.strictEqual(response.body.result, "1234", `Wrong result when connecting to http://${host}:${port}`);
          }
        }
      }
      finally {
        await teardown()
      }
    });

    it("listens on given interface only", async function () {
      // skip this test unless in CI, as this test iterates over all available network interfaces
      // and network interfaces on user machines are unpredictible and may behave in ways that
      // we don't care about.
      if (process.env.CI) this.skip();

      const interfaces = networkInterfaces();
      assert(Object.keys(interfaces).length > 0);

      for (const interfaceName of Object.keys(interfaces)) {
        const interfaceInfo = interfaces[interfaceName];
        assert(interfaceInfo.length > 0);

        for (const info of interfaceInfo) {
          const serverHost = getHost(info, interfaceName);
          const server = await setup(defaultOptions, serverHost);
          try {
            for (const interfaceName of Object.keys(interfaces)) {
              const interfaceInfo = interfaces[interfaceName];
              assert(interfaceInfo.length > 0);

              for (const info of interfaceInfo) {
                const host = getHost(info, interfaceName);

                const requestPromise = post(host, port, jsonRpcJson);
                if (serverHost === host) {
                  const response = await requestPromise;
                  assert.strictEqual(response.status, 200);
                  assert.strictEqual(response.body.result, "1234");
                } else {
                  // we don't test for a specific message, code, or errno because
                  // operating systems and node versions behave differently.
                  await assert.rejects(requestPromise, {
                    address: host,
                    port,
                    syscall: "connect"
                  });
                }
              }
            }
          } finally {
            await server.close();
          }
        }
      }
    }).timeout(50000); // we need a long timeout because the OS may take a while to refuse connections, especially on Windows.
  })

  describe("http", () => {
    async function simpleTest() {
      const response = await request
        .post("http://localhost:" + port)
        .send(jsonRpcJson);
      assert.strictEqual(response.status, 200);

      // make sure we aren't including the uwebsockets header
      assert.strictEqual("uwebsockets" in response.headers, false);

      const json = JSON.parse(response.text);
      assert.strictEqual(json.result, `${networkId}`);
      return response;
    }

    it("handles connector initialization errors by rejecting on .listen", async () => {
      // This Ganache.server({...}) here will cause an internal error in the
      // Ethereum provider initialization. We don't want to throw an unhandled
      // promise reject; so we handle it in the `listen` method.
      const s = Ganache.server({
        fork: { url: "https://mainnet.infura.io/v3/INVALID_URL" }
      });
      await assert.rejects(s.listen(port));
    });

    it("returns its status", async () => {
      const s = Ganache.server();
      try {
        assert.strictEqual(s.status, ServerStatus.ready);
        const pendingListen = s.listen(port);
        assert.strictEqual(s.status, ServerStatus.opening);
        assert.ok(
          s.status & ServerStatus.opening,
          "Bitmask broken: can't be used to determine `opening` state"
        );
        await pendingListen;
        assert.strictEqual(s.status, ServerStatus.open);
        assert.ok(
          s.status & ServerStatus.open,
          "Bitmask broken: can't be used to determine `open` state"
        );
        const pendingClose = s.close();
        assert.strictEqual(s.status, ServerStatus.closing);
        assert.ok(
          s.status & ServerStatus.closing,
          "Bitmask broken: can't be used to determine `closing` state"
        );
        await pendingClose;
        assert.strictEqual(s.status, ServerStatus.closed);
        assert.ok(
          s.status & ServerStatus.closed,
          "Bitmask broken: can't be used to determine `closed` state"
        );
      } catch (e) {
        // in case of failure, make sure we properly shut things down
        if (s.status & ServerStatus.open) {
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
      // @ts-ignore - `s` errors if you run tsc and then test
      // because it tries to compare the built declaration file to
      // the TS file, causing missing #<var> private variables
      s = Ganache.server({
        chain: { networkId }
      });
      s.listen(port, async () => {
        try {
          await simpleTest();
        } finally {
          await teardown();
        }
        done();
      });
    });

    it("accepts port as number type or binary, octal, decimal or hexadecimal string", async () => {
      const validPorts = [
        port, `0b${port.toString(2)}`,
        `0o${port.toString(8)}`, port.toString(10),
        `0x${port.toString(16)}`
      ];

      for (const specificPort of validPorts) {
        s = Ganache.server(defaultOptions);
        await s.listen(<any>specificPort);

        try {
          const req = request.post(`http://localhost:${+specificPort}`);
          await req.send(jsonRpcJson);
        } finally {
          await teardown();
        }
      }
    });

    it("fails with invalid ports", async () => {
      const invalidPorts = [
        -1, 'a', {}, [], false, true,
        0xFFFF + 1, Infinity, -Infinity, NaN,
        undefined, null, '', ' ', 1.1, '0x',
        '-0x1', '-0o1', '-0b1', '0o', '0b', 0
      ];

      for (const specificPort of invalidPorts) {
        s = Ganache.server(defaultOptions);

        try {
          await assert.rejects(s.listen(<any>specificPort), {
            message: `Port should be >= 0 and < 65536. Received ${specificPort}.`
          });
        } finally {
          await teardown();
        }
      }
    });

    it("fails to `.listen()` twice, Promise", async () => {
      await setup();
      try {
        // the call to `setup()` above calls `listen()` already. if we call it
        // again it should fail.
        await assert.rejects(s.listen(port), {
          message: `Server is already open, or is opening, on port: ${port}.`
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
          message: `Server is already open, or is opening, on port: ${port}.`
        });
      } finally {
        await teardown();
      }
    });

    it("fails to `.close()` if server is closed", async () => {
      await setup();
      try {
        await s.close();
        await assert.rejects(s.close(), {
          message: "Server is already closing or closed."
        });
      } finally {
        await teardown();
      }
    });

    it("fails to `.close()` if server is closed", async () => {
      await setup();
      try {
        s.close();
        await assert.rejects(s.close(), {
          message: "Server is already closing or closed."
        });
      } finally {
        await teardown();
      }
    });

    it("closes even if a persistent http connection is open", async () => {
      const agent = new http.Agent({
        keepAlive: true
      });

      await setup();

      try {
        // open the http connection
        await post("localhost", port, jsonRpcJson, agent);

        await s.close();
        // a request is required in order to actually close the connection
        // see https://github.com/trufflesuite/ganache/issues/2788
        await post("localhost", port, jsonRpcJson, agent);

        // connection has now closed, allowing ganache to close
        await assert.rejects(post("localhost", port, jsonRpcJson, agent), {
          code: "ECONNREFUSED"
        });
      } finally {
        teardown();
      }
    });

    it("refuses new connections when waiting on persistent connections to close", async () => {
      const agent = new http.Agent({
        keepAlive: true
      });

      await setup();

      try {
        // open the http connection
        await post("localhost", port, jsonRpcJson, agent);

        await s.close();

        // this connection is on a different connection, so should fail
        await assert.rejects(post("localhost", port, jsonRpcJson), {
          code: "ECONNREFUSED"
        });

        // a request is required in order to actually close the connection
        // see https://github.com/trufflesuite/ganache/issues/2788
        await post("localhost", port, jsonRpcJson, agent);

      } finally {
        teardown();
      }
    });

    it("fails to listen if the socket is already in use by 3rd party, Promise", async () => {
      const server = http.createServer();
      server.listen(port);

      try {
        await assert.rejects(
          setup(),
          `Error: listen EADDRINUSE: address already in use 127.0.0.1:${port}.`
        );
      } finally {
        await Promise.all([
          teardown(),
          new Promise<void>((resolve, reject) =>
            server.close(err => (err ? reject(err) : resolve()))
          )
        ]);
      }
    });

    it("fails to listen if the socket is already in use by 3rd party, Callback", async () => {
      const server = http.createServer();
      server.listen(port);
      try {
        // @ts-ignore - `s` errors if you run tsc and then test
        // because it tries to compare the built declaration file to
        // the TS file, causing missing #<var> private variables
        const s = Ganache.server();
        const listen = promisify(s.listen.bind(s));
        await assert.rejects(listen(port), {
          message: `listen EADDRINUSE: address already in use 127.0.0.1:${port}.`
        });
      } finally {
        await Promise.all([
          teardown(),
          new Promise<void>((resolve, reject) =>
            server.close(err => (err ? reject(err) : resolve()))
          )
        ]);
      }
    });

    // skip on Windows until https://github.com/uNetworking/uSockets/pull/101 is merged
    (IS_WINDOWS ? xit : it)(
      "fails to listen if the socket is already in use by Ganache",
      async () => {
        await new Promise<void>(async resolve => {
          await setup();

          // @ts-ignore - `s` errors if you run tsc and then test
          // because it tries to compare the built declaration file to
          // the TS file, causing missing #<var> private variables
          const s2 = Ganache.server();

          const expectedErrorRegex = new RegExp(`EADDRINUSE.*${port}`);

          const localTearDown = async () => {
            process.removeListener(
              "uncaughtException",
              handleUncaughtException
            );
            process.on("uncaughtException", mochaListener);
            try {
              await s2.close();
            } catch (e: any) {
              if (
                e.message !== "Cannot close server while it is opening." &&
                e.message !== "Server is already closing or closed."
              ) {
                throw e;
              }
            }
            await teardown();
          };

          let uncaughtExceptionOccurred = false;
          const handleUncaughtException = async err => {
            uncaughtExceptionOccurred = true;
            await localTearDown();
            assert.notStrictEqual(
              expectedErrorRegex.exec(err.message),
              `Received unexpected error: ${err.message}`
            );
            resolve();
          };

          const mochaListener = process.listeners("uncaughtException").pop();
          process.removeListener("uncaughtException", mochaListener);
          process.on("uncaughtException", handleUncaughtException);

          try {
            await s2.listen(port);
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!uncaughtExceptionOccurred) {
              assert.fail(
                "Successfully listened twice on the same port instead of erroring"
              );
            }
          } catch (e: any) {
            if (e.code === "ERR_ASSERTION") {
              throw e;
            } else {
              assert.notStrictEqual(
                expectedErrorRegex.exec(e.message),
                `Received unexpected error: ${e.message}`
              );
            }
          } finally {
            if (!uncaughtExceptionOccurred) {
              await localTearDown();
              resolve();
            }
          }
        });
      }
    );

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
    });

    it("does not start a websocket server when `ws` is false", async () => {
      await setup({
        server: {
          ws: false
        }
      });
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

    it("handles chunked requests (note: doesn't test sending with `transfer-encoding: chunked`)", async () => {
      await setup();
      try {
        const req = request.post("http://localhost:" + port);
        const json = JSON.stringify(jsonRpcJson);

        // we have to set the content-length because we can't use
        // `Transfer-Encoding: chunked` to uWebSockets.js as of v15.9.0
        req.set("Content-Length", json.length.toString());

        await new Promise((resolve, reject) => {
          req.on("response", response => {
            const json = JSON.parse(response.text);
            assert.strictEqual(json.result, `${networkId}`);
            resolve(void 0);
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

    it("responds with transfer-encoding: chunked responses when bufferification is triggered", async () => {
      const originalThreshold = Connector.BUFFERIFY_THRESHOLD;
      // This will trigger bufferication in the Ethereum connector
      // for calls to debug_traceTransaction that return structLogs that have a
      // length greater than BUFFERIFY_THRESHOLD
      Connector.BUFFERIFY_THRESHOLD = 0;

      try {
        await setup();
        const [from] = await s.provider.send("eth_accounts");
        await s.provider.send("eth_subscribe", ["newHeads"]);

        const ops = [
          { op: "PUSH1", code: "60", data: "00" },
          { op: "PUSH1", code: "60", data: "00" },
          { op: "RETURN", code: "f3", data: "" }
        ];
        // a silly "contract" we can trace later: PUSH 0, PUSH, 0, RETURN
        const data = "0x" + ops.map(op => op.code + op.data).join("");
        const hash = s.provider.send("eth_sendTransaction", [{ from, data }]);
        await s.provider.once("message");

        // send a `debug_traceTransaction` request to the *server* so we can
        // test for `transfer-encoding: chunked` and bufferfication.
        const jsonRpcJson: any = {
          jsonrpc: "2.0",
          id: "1",
          method: "debug_traceTransaction",
          params: [await hash]
        };

        const { text, header, status } = await request
          .post("http://localhost:" + port)
          .send(jsonRpcJson);
        const { result } = JSON.parse(text);

        assert.strictEqual(header["transfer-encoding"], "chunked");
        assert.strictEqual(header["content-type"], "application/json");
        assert.strictEqual(status, 200);
        assert.strictEqual(result.structLogs.length, ops.length);
      } finally {
        Connector.BUFFERIFY_THRESHOLD = originalThreshold;
        await teardown();
      }
    });

    it("returns 200/OK for RPC errors over HTTP", async () => {
      await setup();
      const jsonRpcJson: any = {
        jsonrpc: "2.0",
        id: "1",
        method: "eth_subscribe",
        params: []
      };
      try {
        const response = await request
          .post("http://localhost:" + port)
          .send(jsonRpcJson);
        assert.strictEqual(response.status, 200);
        assert.strictEqual(
          JSON.parse(response.text).error.message,
          "notifications not supported"
        );
      } finally {
        await teardown();
      }
    });

    it("handles batched json-rpc requests/responses", async () => {
      await setup();
      const jsonRpcJson: any = [
        {
          jsonrpc: "2.0",
          id: "1",
          method: "net_version",
          params: []
        },
        {
          jsonrpc: "2.0",
          id: "2",
          method: "eth_chainId",
          params: []
        },
        {
          jsonrpc: "2.0",
          id: "3",
          method: "eth_subscribe", // this one fails over HTTP
          params: ["newHeads"]
        }
      ];
      try {
        const response = await request
          .post("http://localhost:" + port)
          .send(jsonRpcJson);
        const json = JSON.parse(response.text);
        assert.deepStrictEqual(json[0], {
          jsonrpc: "2.0",
          id: "1",
          result: "1234"
        });
        assert.deepStrictEqual(json[1], {
          jsonrpc: "2.0",
          id: "2",
          result: "0x539"
        });
        assert.deepStrictEqual(json[2].jsonrpc, "2.0");
        assert.deepStrictEqual(json[2].id, "3");
        assert.deepStrictEqual(json[2].error.code, -32004);
        assert.deepStrictEqual(
          json[2].error.message,
          "notifications not supported"
        );
      } finally {
        await teardown();
      }
    });

    it("returns a teapot (easter egg)", async () => {
      await setup();
      try {
        const result = await request
          .get("http://localhost:" + port + "/418")
          .catch(e => e);
        assert.strictEqual(result.status, 418);
        assert.strictEqual(result.message, "I'm a Teapot");
      } finally {
        await teardown();
      }
    });

    it("returns 404 for bad routes", async () => {
      await setup();
      const methods = [
        "get",
        "post",
        "head",
        "options",
        "put",
        "delete",
        "patch",
        "trace"
      ] as const;
      try {
        const requests = methods.map(async method => {
          const result = await request[method](
            "http://localhost:" + port + "/there-is-no-spoon"
          ).catch((e: any) => e);
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
        const oldRequestRaw = (provider as any)._requestRaw;
        const req = request.post("http://localhost:" + port);
        const abortPromise = new Promise(resolve => {
          (provider as any)._requestRaw = () => {
            // abort the request object after intercepting the request
            req.abort();
            return new Promise(innerResolve => {
              // It takes 2 passes of the event loop to register the `abort`
              // server-side:
              setImmediate(setImmediate, () => {
                // resolve the `provider.send` to make sure the server can
                // handle _not_ responding to a request that has been aborted:
                innerResolve({ value: Promise.resolve() as any });
                // and finally, resolve the `abort` promise:
                resolve(void 0);
              });
            });
          };
        });
        const result = await req.send(jsonRpcJson).catch(e => e);
        assert.strictEqual(result.code, "ABORTED", "Response was not aborted");

        // wait for the server to react to the requesrt's `abort`
        await abortPromise;

        provider._requestRaw = oldRequestRaw;

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
      const optionsHeaders = [
        "Access-Control-Allow-Methods",
        "Access-Control-Allow-Headers",
        "Access-Control-Max-Age"
      ] as const;
      const baseHeaders = [
        "Access-Control-Allow-Credentials",
        "Access-Control-Allow-Origin"
      ] as const;
      const allCorsHeaders = [...optionsHeaders, ...baseHeaders] as const;

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
          assert.strictEqual(
            resp.header["access-control-allow-credentials"],
            "true"
          );
          assert.strictEqual(
            resp.header["access-control-allow-origin"],
            origin
          );
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
          assert.strictEqual(
            resp.header["access-control-allow-methods"],
            "POST"
          );
          assert.strictEqual(
            resp.header["access-control-allow-origin"],
            origin
          );
          assert.strictEqual(resp.header["access-control-max-age"], "600");
          // TODO: enable this check once https://github.com/uNetworking/uWebSockets/issues/1370 is fixed
          // assert.strictEqual(
          //   "content-length" in resp.header,
          //   false,
          //   "RFC 7230: A server MUST NOT send a Content-Length header field in any response with a status code of 1xx (Informational) or 204 (No Content)"
          // );
          assert.strictEqual(
            resp.header["access-control-allow-credentials"],
            "true"
          );
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

      const { data }: any = await new Promise(resolve => {
        ws.on("open", () => {
          ws.send(JSON.stringify(jsonRpcJson));
        });
        ws.on("message", (data, isBinary) => resolve({ data, isBinary }));
      });
      const json = JSON.parse(data);
      assert.strictEqual(json.result, `${networkId}`);
    });

    it("returns the net_version over a websocket as binary", async () => {
      const ws = new WebSocket("ws://localhost:" + port);
      const response: any = await new Promise(resolve => {
        ws.on("open", () => {
          const strToAB = (str: string) =>
            new Uint8Array(str.split("").map(c => c.charCodeAt(0))).buffer;
          ws.send(strToAB(JSON.stringify(jsonRpcJson)));
        });
        ws.on("message", resolve);
      });
      assert.strictEqual(
        response.constructor,
        Buffer,
        "response doesn't seem to be a Buffer as expected"
      );
      const json = JSON.parse(response);
      assert.strictEqual(
        json.result,
        `${networkId}`,
        "Binary data result is not as expected"
      );
    });

    it("doesn't crash when sending bad data over http", async () => {
      await assert.rejects(
        request.post("http://localhost:" + port).send("This is _not_ pudding."),
        {
          message: "Bad Request"
        }
      );

      const response = await request
        .post("http://localhost:" + port)
        .send(jsonRpcJson);
      const json = JSON.parse(response.text);
      assert.strictEqual(json.result, `${networkId}`);
    });

    it("doesn't crash when sending bad data over websocket", async () => {
      const ws = new WebSocket("ws://localhost:" + port);
      const result = await new Promise<any>(resolve => {
        ws.on("open", () => {
          ws.on("message", resolve);
          ws.send("What is it?");
        });
      });
      const json = JSON.parse(result);
      assert.strictEqual(json.error.code, -32700);
    });

    it("doesn't crash when the connection is closed while a request is in flight", async () => {
      const provider = s.provider as EthereumProvider;
      provider._requestRaw = (async () => {
        // close our websocket after intercepting the request
        await s.close();
        return { value: Promise.resolve(void 0) };
      }) as any;

      const ws = new WebSocket("ws://localhost:" + port);
      return new Promise((resolve, reject) => {
        ws.on("open", () => {
          // If we get a message that means things didn't get closed as they
          // should have OR they are closing too late for some reason and
          // this test isn't testing anything.
          ws.on("message", () =>
            reject("Got a message when we shouldn't have!")
          );

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
      const oldRequestRaw = provider._requestRaw.bind(provider);
      provider._requestRaw = (async () => {
        const promiEvent = new PromiEvent(resolve => {
          const subId = "0xsubscriptionId";
          resolve(subId);
          setImmediate(() =>
            promiEvent.emit("message", {
              data: { subscription: subId, result: message }
            })
          );
        });
        return { value: promiEvent };
      }) as any;

      const ws = new WebSocket("ws://localhost:" + port);
      const result = await new Promise(resolve => {
        ws.on("open", () => {
          ws.on("message", data => {
            const { result, params } = JSON.parse(data.toString());
            // ignore the initial response
            if (result === "0xsubscriptionId") return;

            resolve(params.result);
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

      provider._requestRaw = oldRequestRaw;
    });

    it("handles batched json-rpc requests/responses", async () => {
      const jsonRpcJson: any = [
        {
          jsonrpc: "2.0",
          id: "1",
          method: "net_version",
          params: []
        },
        {
          jsonrpc: "2.0",
          id: "2",
          method: "eth_chainId",
          params: []
        },
        {
          jsonrpc: "2.0",
          id: "3",
          method: "eth_subscribe", // this one works here in WS-land
          params: ["newHeads"]
        }
      ];

      const ws = new WebSocket("ws://localhost:" + port);
      const response: any = await new Promise(resolve => {
        ws.on("open", () => {
          ws.send(JSON.stringify(jsonRpcJson));
        });
        ws.on("message", resolve);
      });
      ws.close();

      const json = JSON.parse(response);
      assert.deepStrictEqual(json, [
        {
          jsonrpc: "2.0",
          id: "1",
          result: "1234"
        },
        {
          jsonrpc: "2.0",
          id: "2",
          result: "0x539"
        },
        {
          jsonrpc: "2.0",
          id: "3",
          result: "0x1"
        }
      ]);
    });

    it("handles invalid json-rpc JSON", async () => {
      const ws = new WebSocket("ws://localhost:" + port);
      const response = await new Promise<any>(resolve => {
        ws.on("open", () => {
          ws.send(JSON.stringify(null));
        });
        ws.on("message", data => {
          resolve(JSON.parse(data.toString()));
        });
      });
      assert.strictEqual(response.error.code, -32700);
    });

    it("doesn't crash when the connection is closed while a subscription is in flight", async () => {
      const provider = s.provider as EthereumProvider;
      let promiEvent: PromiEvent<any>;
      provider._requestRaw = (async () => {
        promiEvent = new PromiEvent(resolve => {
          resolve("0xsubscriptionId");
        });
        return { value: promiEvent };
      }) as any;

      const ws = new WebSocket("ws://localhost:" + port);
      return new Promise((resolve, reject) => {
        ws.on("open", () => {
          // If we get a message that means things didn't get closed as they
          // should have OR they are closing too late for some reason and
          // this test isn't testing anything.
          ws.on("message", data => {
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

    it("responds with transfer-encoding: chunked responses when bufferification is triggered", async () => {
      // this test needs to set BUFFERIFY_THRESHOLD before starting the server
      await teardown();

      const originalThreshold = Connector.BUFFERIFY_THRESHOLD;
      // This will trigger bufferication in the Ethereum connector
      // for calls to debug_traceTransaction that return structLogs that have a
      // length greater than BUFFERIFY_THRESHOLD
      Connector.BUFFERIFY_THRESHOLD = 0;

      try {
        await setup();
        const [from] = await s.provider.send("eth_accounts");
        await s.provider.send("eth_subscribe", ["newHeads"]);

        const ops = [
          { op: "PUSH1", code: "60", data: "00" },
          { op: "PUSH1", code: "60", data: "00" },
          { op: "RETURN", code: "f3", data: "" }
        ];
        // a silly "contract" we can trace later: PUSH 0, PUSH, 0, RETURN
        const data = "0x" + ops.map(op => op.code + op.data).join("");
        const hash = s.provider.send("eth_sendTransaction", [{ from, data }]);
        await s.provider.once("message");

        // send a `debug_traceTransaction` request to the *server* so we can
        // test for `transfer-encoding: chunked` and bufferfication.
        const jsonRpcJson: any = {
          jsonrpc: "2.0",
          id: "1",
          method: "debug_traceTransaction",
          params: [await hash]
        };

        const ws = new WebSocket("ws://localhost:" + port);
        ws.binaryType = "fragments";
        const response: any = await new Promise(resolve => {
          ws.on("open", () => {
            ws.send(Buffer.from(JSON.stringify(jsonRpcJson)), {
              binary: true
            });
          });
          ws.on("message", resolve);
        });

        assert.strictEqual(Array.isArray(response), true);
        const { result } = JSON.parse(Buffer.concat(response));
        assert.strictEqual(result.structLogs.length, ops.length);
      } finally {
        Connector.BUFFERIFY_THRESHOLD = originalThreshold;
        await teardown();
      }
    });

    describe("max payload size", () => {
      let ws: WebSocket;
      beforeEach(() => {
        ws = new WebSocket("ws://localhost:" + port);
      });
      afterEach(() => {
        if (ws) {
          ws.close();
        }
      });

      const canSendPayloadWithoutSocketClose = (payload: Buffer) => {
        return new Promise<boolean>(resolve => {
          const handleClose = code => {
            resolve(false);
          };
          ws.on("open", () => ws.send(payload));
          ws.on("close", handleClose);
          ws.once("message", () => {
            ws.off("close", handleClose);
            resolve(true);
          });
        });
      };

      it("can handle payloads up to max payload size", async () => {
        // This payload is invalid JSON-RPC, but we are just testing if the
        // server will receive it _at all_. It _should_ reject it as invalid
        // data, but *not* close the connection.
        const largePayload = Buffer.alloc(WS_MAX_PAYLOAD_SIZE);
        assert.strictEqual(
          await canSendPayloadWithoutSocketClose(largePayload),
          true
        );
      });

      it("can not send payload greater than max payload size; ws is closed on large payloads", async () => {
        // This payload is invalid JSON-RPC, but we are just testing if the
        // server will receive it _at all_. It _should_ close the websocket
        // connection, not just reject the data.
        const tooLargePayload = Buffer.alloc(WS_MAX_PAYLOAD_SIZE + 1);
        assert.strictEqual(
          await canSendPayloadWithoutSocketClose(tooLargePayload),
          false
        );
      });
    });

    // TODO: actually handle backpressure!
    it.skip("can handle backpressure", async () => {
      {
        // create tons of data to force websocket backpressure
        const huge = {};
        for (let i = 0; i < 1e6; i++) huge["prop_" + i] = { i };
        (s.provider as EthereumProvider)._requestRaw = (async () => {
          return { value: Promise.resolve(huge) };
        }) as any;
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
                    "Possible false positive: Didn't detect backpressure" +
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
    }).timeout(10000);
  });

  describe("emitter", () => {
    let server: Server;
    let didEmitOpen = false;
    let didEmitClose = false;

    before(async () => {
      server = Ganache.server();
      server.on("open", () => {
        didEmitOpen = true;
      });
      server.on("close", () => {
        didEmitClose = true;
      });
    });

    it("emits the open event", async () => {
      assert.strictEqual(didEmitOpen, false);
      assert.strictEqual(didEmitClose, false);
      await server.listen(port);
      assert.strictEqual(didEmitOpen, true);
      assert.strictEqual(didEmitClose, false);
    });

    it("emits the close event", async () => {
      assert.strictEqual(didEmitOpen, true);
      assert.strictEqual(didEmitClose, false);
      await server.close();
      assert.strictEqual(didEmitOpen, true);
      assert.strictEqual(didEmitClose, true);
    });
  });
});
