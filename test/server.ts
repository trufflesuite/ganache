import Ganache from "../index"
import * as assert from "assert";
import request from "superagent";
import WebSocket from "ws";
import Server from "../src/server";
import { ServerOptions } from "../src/server";
import http from "http";
import intoStream from "into-stream";

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
  }
  let s: Server;
  async function setup(options: ServerOptions = {
    network_id,
    logger
  } as ServerOptions) {
    s = Ganache.server(options);
    return s.listen(port);
  };
  async function teardown(){
    s && s.close();
    s = undefined;
  }
  describe("http", () => {
    it("returns the net_version", async () => {
      await setup();
      try {
        const response = await request
          .post('http://localhost:' + port)
          .send(jsonRpcJson);
        const json = JSON.parse(response.text);
        assert.strictEqual(json.result, network_id);
      } finally {
        teardown();
      }
    });

    it("returns the net_version over a legacy-style connection listener", (done) => {
      s = Ganache.server({
        network_id
      } as ServerOptions);
      s.listen(port, async () => {
        try {
          const response = await request
            .post('http://localhost:' + port)
            .send(jsonRpcJson);
          const json = JSON.parse(response.text);
          assert.strictEqual(json.result, network_id);
        } finally {
          teardown();
        }
        done();
      });
    });

    it("fails to `.listen()` twice", async () => {
      await setup();
      try {
        // the call to `setup()` above calls `listen()` already. if we call it 
        // again it should fail.
        await assert.rejects(s.listen(port), {
          message: `Server is already listening on port: ${port}`
        });
      } finally {
        teardown();
      }
    });

    it("fails to listen if the socket is already in use by 3rd party", async () => {
      const server = http.createServer();
      server.listen(port);

      try {
        await assert.rejects(setup, {
          message: `Failed to listen on port: ${port}`
        });
      } finally {
        teardown();
        server.close();
      }
    });

    // TODO: un-skip this test once uWebsockets is updated to include seese's fix
    it.skip("fails to listen if the socket is already in use by Ganache", async () => {
      await setup();
      const s2 = Ganache.server();

      try {
        await assert.rejects(s2.listen(port), {
          message: `Failed to listen on port: ${port}`
        });
      } finally {
        teardown();
      }
    });

    it("does not start a websocket server when `ws` is false", async () => {
      await setup({
        ws: false
      } as ServerOptions);
      try {
        const ws = new WebSocket('ws://localhost:' + port);

        await assert.rejects(new Promise((_, reject) => ws.on("error", reject)), {
          message: "Unexpected server response: 400"
        });
      } finally {
        teardown();
      }
    });

    it("handles chunked requests (note: doesn't test `transfer-encoding: chunked`)", async () => {
      await setup();
      try {
        const req = request.post('http://localhost:' + port);
        const json =JSON.stringify(jsonRpcJson);

        // we have to set the content-length because we can't use
        // `Transfer-Encoding: chunked` with uWebSockets.js as of v15.9.0
        req.set('Content-Length', json.length.toString());

        await new Promise((resolve, reject) => {
          req.on("response", response => {
            const json = JSON.parse(response.text);
            assert.strictEqual(json.result, network_id);
            resolve();
          });
          req.on("error", function(){
            console.log(...arguments);
            reject();
          });
          req.on("progress", function(){
            console.log(...arguments);
          });

          const readableStream = intoStream(json);
          // make sure the data is sent as tiny pieces.
          (readableStream as any)._readableState.highWaterMark = 8;
          readableStream.pipe(req as any);
        });
      } finally {
        teardown();
      }
    });
  });

  describe("websocket", () => {
    beforeEach("setup", setup);
    afterEach("teardown", teardown);

    it("returns the net_version over a websocket", async () => {
      const ws = new WebSocket('ws://localhost:' + port);

      const response: any = await new Promise((resolve) => {
        ws.on("open", () => {
          ws.send(JSON.stringify(jsonRpcJson));
        });
        ws.on('message', resolve);
      });
      const json = JSON.parse(response);
      assert.strictEqual(json.result, network_id);
    });

    it("returns the net_version over a websocket as binary", async () => {
      const ws = new WebSocket('ws://localhost:' + port);
      const response: any = await new Promise((resolve) => {
        ws.on("open", () => {
          const strToAB = (str: string) => new Uint8Array(str.split('').map(c => c.charCodeAt(0))).buffer;
          ws.send(strToAB(JSON.stringify(jsonRpcJson)));
        });
        ws.on('message', resolve);
      });
      assert.strictEqual(response.constructor, Buffer, "response doesn't seem to be a Buffer as expect");
      const json = JSON.parse(response);
      assert.strictEqual(json.result, network_id, "Binary data result is not as expected");
    });

    it("doesn't crash when sending bad data over http", async () => {
      await assert.rejects(request
        .post('http://localhost:' + port)
        .send("This is _not_ pudding.")
      , {
        message: "Bad Request"
      });

      const response = await request
        .post('http://localhost:' + port)
        .send(jsonRpcJson);
      const json = JSON.parse(response.text)
      assert.strictEqual(json.result, network_id);
    });

    it("doesn't crash when sending bad data over websocket", async () => {
      const ws = new WebSocket('ws://localhost:' + port);
      const result: number = await new Promise((resolve) => {
        ws.on("open", () => {
          ws.on("close", resolve);
          ws.send("What is it?");
        });
      });
      assert.strictEqual(result, 1002, "Did not receive expected close code 1002");
    });

    it("doesn't crash when the connection is closed while a request is in flight", async () => {
      s.provider.send = async function() {
        // close our websocket after intercepting the request
        s.close();
      };

      const ws = new WebSocket('ws://localhost:' + port);
      return new Promise((resolve, reject) => {       
        ws.on("open", () => {
          // If we get a message that means things didn't get closed as they
          // should have OR they are closing too late for some reason and
          // this test isn't testing anything.
          ws.on("message", () => reject("Got a message when we should have!"));

          // make sure we leave enough time for things to crash if it does end
          // up crashing.
          ws.on("close", () => setImmediate(resolve));

          // The RPC request method doesn't matter since we're duck punching our
          // provider.send method anyway.
          ws.send(JSON.stringify(jsonRpcJson));
        });
      });
    });

    it("can handle backpressure", async () => {
      { // create tons of data to force websocket backpressure
        const huge = {} as any;
        for (let i = 0; i < 1e6; i++) huge["prop_" + i] = {i};
        s.provider.send = async () => huge;
      }
      
      const ws = new WebSocket('ws://localhost:' + port);
      const oldLog = logger.log;
      try {
        let gotBackpressure = false;
        // duck punch `logger.log` so we can intercept logs
        logger.log = (message: string) => {
          if (message.indexOf("WebSocket backpressure: ") === 0) {
            gotBackpressure = true;
          }
        }
        return await new Promise((resolve, reject) => {
          ws.on("open", () => {
            ws.on("message", (_message) => {
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
    });
  });
});
