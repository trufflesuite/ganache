import Ganache from "../index"
import assert from "assert";
import Provider from "../src/provider";

describe("provider", () => {
  const networkId = "1234";
  let p: Provider;

  beforeEach("set up", () =>{
    p = Ganache.provider({
      network_id: networkId
    });
  })
  it("gets balance", async() => {
    const accounts = await p.send("eth_accounts");
    const balance = await p.send("eth_getBalance", [accounts[0]]);
    // TODO: this value is actually wrong!
    assert.strictEqual(balance, "0x056bc75e2d63100000", "Heyo!");
  })
  it.only("sends a transaction", async () => {
    const accounts = await p.send("eth_accounts");
    const to = accounts[accounts.length - 1];

    await p.send("eth_sendTransaction", [{
      from: accounts[0],
      to: to,
      value: 10_000,
      nonce: 0,
      gasPrice: 100
    }]);
    await p.send("eth_sendTransaction", [{
      from: accounts[0],
      to: to,
      value: 20_000,
      nonce: 0,
      gasPrice: 200
    }]);
    await p.send("eth_sendTransaction", [{
      from: accounts[2],
      to: to,
      value: 30_000,
      nonce: 0,
      gasPrice: 300
    }]);

  });
  it("sends a transaction", async () => {
    const seedrandom = require("seedrandom");
    const rand = seedrandom("sup");
    const accounts = await p.send("eth_accounts");




    const nonces = [5, 3, 2, 1, 0];
    const to = accounts[accounts.length - 1];


    const id = setImmediate(()=>{console.log(1)});
    p.send("eth_sendTransaction", [{
      from: accounts[0],
      to: to,
      value: 10_000,
      nonce: nonces[2],
      gasPrice: (rand() * 100) | 0
    }]);
    clearImmediate(id);

    // for every account (except the last one)
    for (let j = 0; j < accounts.length - 6; j++) {
      for (let i = 0; i < nonces.length; i++) {
      // send transactions with our random nonces
        await p.send("eth_sendTransaction", [{
          from: accounts[j],
          to: to,
          value: 10_000,
          nonce: nonces[i],
          gasPrice: (rand() * 100) | 0
        }]);
      }
    }
  });
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
      message: "Invalid or unsupported method: toString"
    });
    await assert.rejects(p.send("yo_mamma!"), {
      message: "Invalid or unsupported method: yo_mamma!"
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
      message: "Invalid or unsupported method: \u0001"
    });
  });
});
