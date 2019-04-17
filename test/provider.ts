import Ganache from "../index"
import * as assert from "assert";
import Provider from "../src/provider";

describe("provider", () => {
  const networkId = "1234";
  let p: Provider;
  beforeEach("set up", () =>{
    p = Ganache.provider({
      network_id: networkId
    });
  })
  it.skip("returns a transaction", async () => {
    var result = await p.send("eth_getTransactionByHash", ["0x123"]);
    const v = result.blockNumber;
    // todo: figure things out
  })
  it("returns things via EIP-1193", async () => {
    const version = await p.send("net_version");
    assert.strictEqual(version, networkId);
  });
  it("returns things via legacy", (done) => {
    const ret = p.send({
      id: "1",
      jsonrpc: "2.0",
      method: "net_version"
    } as any, (_err: Error, result: any): void => {
      assert.strictEqual(result.result, networkId);
      done();
    });
    assert.strictEqual(ret, undefined);
  });

  it("returns rejects invalid rpc methods", async () => {
    await assert.rejects(p.send("toString"), {
      message: "Invalid method: toString"
    });
    await assert.rejects(p.send("yo_mamma!"), {
      message: "Invalid method: yo_mamma!"
    });
    const str = Buffer.from([1]) as any as string;
    await assert.rejects(new Promise((resolve, reject) => {
      p.send({
        id: "1",
        jsonrpc: "2.0",
        method: str as any
      } as any, (err: Error, result: any): void => {
        if(err) {
           reject(err);
        } else {
          resolve(result);
        }
      })
    }), {
      message: "Invalid method: \u0001"
    });
  });
});
