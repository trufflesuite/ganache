import Ganache from "../index"
import * as assert from "assert";
import request from "superagent";
import WebSocket from "ws";
import Server from "../src/server";
import { ServerOptions } from "../src/server";


describe("server", () => {
  const port = 8545;
  const netVersion = "1234";
  const jsonRpcJson: any = {
    jsonrpc: "2.0",
    id: "1",
    method: "net_version",
    params: []
  };
  let s: Server;
  beforeEach("setup", async ()=>{
    s = Ganache.server({
      network_id: netVersion
    } as ServerOptions);
    await s.listen(port);
  })
  describe("http", () => {
    it("returns the net_version", async () => {
      const response = await request
        .post('http://localhost:' + port)
        .send(jsonRpcJson);
      const json = JSON.parse(response.text)
      assert.strictEqual(json.result, netVersion);
    });
  });

  describe("websocket", () => {
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
  });

  afterEach("teardown", ()=>{
    s && s.close();
    s = undefined;
  });
});
