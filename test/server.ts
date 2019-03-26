import Ganache from "../index"
import * as assert from "assert";
import request from "superagent";
import WebSocket from "ws";
import Server from "../src/server";
import { ServerOptions } from "../src/server";


describe("server", () => {
  const jsonRpcJson: any = {
    jsonrpc: "2.0",
    id: "1",
    method: "net_version",
    params: []
  };
  let s: Server;
  beforeEach("setup", async ()=>{
    s = Ganache.server();
    await s.listen(8545);
  })
  it("returns things", async ()=>{
    const s = Ganache.server();
    await s.listen(8545);
    const response = await request
      .post('http://127.0.0.1:8545')
      .send(jsonRpcJson)
      .set('accept', 'json');
    const json = JSON.stringify(response.text)
    assert.ok(json);
  });

  it("returns things over a websocket", async ()=>{
    const s = Ganache.server({
      network_id: 1234
    } as ServerOptions);
    await s.listen(8545);
    const ws = new WebSocket('ws://127.0.0.1:8545');

    const result: any = await new Promise((resolve) => {
      ws.on("open", function open() {
        ws.send(JSON.stringify(jsonRpcJson));
      });
      ws.on('message', resolve);
    });
    const json = JSON.parse(result);
    assert.ok(json);
  })

  afterEach("teardown", ()=>{
    s && s.close();
  })
});
