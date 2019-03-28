import Ganache from "../index"
import * as assert from "assert";

describe("provider", () => {
  const networkId = "1234";
  it("returns things via EIP-1193", async () => {
    const p = Ganache.provider({
      network_id: networkId
    });
    const version = await p.send("net_version");
    assert.strictEqual(version, networkId);
  });
  it("returns things via legacy", (done) => {
    const p = Ganache.provider({
      network_id: networkId
    });
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
    const p = Ganache.provider({
      network_id: networkId
    });
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
