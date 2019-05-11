import Ganache from "../index"
import * as assert from "assert";
import request from "superagent";
import WebSocket from "ws";
import Server from "../src/server";
import { ServerOptions } from "../src/server";
import http from "http";


describe("server", () => {
  const port = 5234;
  const netVersion = "1234";
  const jsonRpcJson: any = {
    jsonrpc: "2.0",
    id: "1",
    method: "net_version",
    params: []
  };
  let s: Server;
  async function setup() {
    s = Ganache.server({
      network_id: netVersion
    } as ServerOptions);
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
        assert.strictEqual(json.result, netVersion);
      } finally {
        teardown();
      }
    });

    it("returns the net_version over a legacy connection", (done) => {
      const s = Ganache.server({
        network_id: netVersion
      } as ServerOptions);
      s.listen(port, async () => {
        try {
          const response = await request
            .post('http://localhost:' + port)
            .send(jsonRpcJson);
          const json = JSON.parse(response.text);
          assert.strictEqual(json.result, netVersion);
        } finally {
          s.close();
        }
        done();
      });
    });

    it("fails to `.listen()` twice", async () => {
      await setup();
      try {
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

    // TODO: active this test once uWebsockets is updated to include seese's fix
    it.skip("fails to listen if the socket is already in use by Ganache", async () => {
      const s2 = Ganache.server({
        network_id: netVersion
      } as ServerOptions);

      await assert.rejects(s2.listen(port), {
        message: `Failed to listen on port: ${port}`
      });
    });

    it("does not start a websocket server when `ws` is false", async () => {
      s = Ganache.server({
        network_id: netVersion,
        ws: false
      } as ServerOptions);
      await s.listen(port);
      try {
        const ws = new WebSocket('ws://localhost:' + port);

        await assert.rejects(new Promise((_, reject) => {
          ws.on("error", reject);
        }), {
          message: "Unexpected server response: 400"
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
      assert.strictEqual(json.result, netVersion);
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
      assert.strictEqual(json.result, netVersion, "Binary data result is not as expected");
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
      assert.strictEqual(json.result, netVersion);
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
      const ws = new WebSocket('ws://localhost:' + port);
      await new Promise((resolve) => {
        ws.on("open", () => {
          ws.send(JSON.stringify(jsonRpcJson));
          ws.on("message", () => {
            assert.fail("Got a message when we should have!");
          });
          ws.on("close", resolve);
        });

        s.provider.send = async function() {
          // close our websocket when after intercepting the request
          s.close();
          return new Promise(resolve => {
            // then resolve on the next-ish event loop
            setImmediate(resolve);
          });
        };
      });
    });
  });
});
