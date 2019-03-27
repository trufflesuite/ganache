import Ganache from "../index"
import * as assert from "assert";
import request from "superagent";
import WebSocket from "ws";
import Server from "../src/server";
import { ServerOptions } from "../src/server";


describe("server", () => {
  const port = 8545;
  const jsonRpcJson: any = {
    jsonrpc: "2.0",
    id: "1",
    method: "net_version",
    params: []
  };
  let s: Server;
  beforeEach("setup", async ()=>{
    s = Ganache.server({
      network_id: 1234
    } as ServerOptions);
    await s.listen(port);
  })
  describe("http", () => {
    it.only("returns things", async () => {
      const response = await request
        .post('http://localhost:' + port)
        .send(jsonRpcJson)
        .set('accept', 'json');
      const json = JSON.parse(response.text)
      assert.ok(json);
    });
  });

  describe("websocket", () => {
    it("returns things over a websocket", async () => {
      const ws = new WebSocket('ws://localhost:' + port);

      const result: any = await new Promise((resolve) => {
        ws.on("open", () => {
          ws.send(JSON.stringify(jsonRpcJson));
        });
        ws.on('message', resolve);
      });
      const json = JSON.parse(result);
      assert.ok(json);
    });

    it("returns things over a websocket as binary", async () => {
      const ws = new WebSocket('ws://localhost:' + port);
      const result: any = await new Promise((resolve) => {
        ws.on("open", () => {
          const strToAB = (str: string) => new Uint8Array(str.split('').map(c => c.charCodeAt(0))).buffer;
          ws.send(strToAB(JSON.stringify(jsonRpcJson)));
        });
        ws.on('message', resolve);
      });
      const json = JSON.parse(result);
      assert.ok(json);
    });

    it("doesn't crash when sending bad data over http", async () => {
      await assert.rejects(request
        .post('http://localhost:' + port)
        .send("This is _not_ pudding")
      , /^Error: Bad Request$/);

      const response = await request
        .post('http://localhost:' + port)
        .send(jsonRpcJson)
        .set('accept', 'json');
      const json = JSON.parse(response.text)
      assert.ok(json);
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
  })
});
