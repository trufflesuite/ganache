const assert = require("assert");
const fs = require("fs");
const { Fork } = require("./src/chains/ethereum/ethereum/lib/src/forking/fork");
const {
  PersistentCache
} = require("./src/chains/ethereum/ethereum/lib/src/forking/persistent-cache/persistent-cache");
const {
  initialize
} = require("./src/chains/ethereum/ethereum/lib/src/forking/persistent-cache/ipc/ipc");
const {
  Quantity,
  Data
} = require("./src/chains/ethereum/utils/node_modules/@ganache/utils");

async function runTests(height, url) {
  const c = await initialize(() => {
    return Promise.resolve({ number: "0x1", hash: "0x0123" });
  });
  const h = await c.resolveTargetAndClosestAncestor(
    Quantity.from(1),
    Data.from("0x0123")
  );
  setTimeout(c.disconnect.bind(c), 1000);
  return;
  const phork = new Fork(
    {
      chain: {
        hardfork: "london"
      },
      wallet: {
        accounts: []
      },
      fork: {
        url: new URL(
          url
          // "wss://mainnet.infura.io/ws/v3/0e96090b2eb34ea293a23feec9594e20"
          //"https://www.ethercluster.com/etc"
        ),
        userAgent: "Sup",
        blockNumber: height,
        cache: true
      }
    },
    []
  );

  await phork.initialize();
  const accounts = [
    "0x829BD824B016326A401d083B33D092293333A830"
    // , "0x00000000219ab540356cBB839Cbe05303d7705Fa",
    // "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    // "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8",
    // "0x73BCEb1Cd57C711feaC4224D062b0F6ff338501e",
    // "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5",
    // "0x9BF4001d307dFd62B26A2F1307ee0C0307632d59",
    // "0x53d284357ec70cE289D6D64134DfAc8E511c8a3D",
    // "0x61edcdf5bb737adffe5043706e7c5bb1f1a56eea",
    // "0xc61b9bb3a7a0767e3179713f3a5c7a9aedce193c",
    // "0x1b3cb81e51011b549d78bf720b0d924ac763a7c2"
  ];
  const blockNumbers = [
    height - 99
    // , height - 298,
    // height - 497
  ];
  await Promise.all(
    accounts.map(async a => {
      return Promise.all(
        blockNumbers.map(async b => {
          const c = await phork.request("eth_getBalance", [
            a,
            `0x${b.toString(16)}`
          ]);
          // const postData = JSON.stringify({
          //   jsonrpc: "2.0",
          //   id: 1,
          //   method: "eth_getBalance",
          //   params: [a, `0x${b.toString(16)}`]
          // });
          // const v = await new Promise(resolve => {
          //   const req = require("https").request({
          //     protocol: "https:",
          //     host: "mainnet.infura.io",
          //     port: 443,
          //     path: "/v3/0e96090b2eb34ea293a23feec9594e20",
          //     method: "POST"
          //   });
          //   req.on("response", res => {
          //     let data = Buffer.from([]);
          //     res.on("data", d => {
          //       data = Buffer.concat([data, d]);
          //     });
          //     res.on("end", () => {
          //       resolve(JSON.parse(data).result);
          //     });
          //   });
          //   req.write(postData);
          //   req.end();
          // });
          // assert.strictEqual(c, v);
          console.log(`${a}@${`0x${b.toString(16)}`}=${c}`);
        })
      );
    })
  );
  await phork.close();
}
let j = [];

(async function () {
  // for (var i = 13211358; i < 13311358; i += 10000) {
  //   await go(i);
  // }
  const MAINNET =
    "wss://mainnet.infura.io/ws/v3/0e96090b2eb34ea293a23feec9594e20";

  await runTests(6000000, MAINNET);
  // await runTests(6000500, MAINNET);

  // await runTests(1900000, "https://www.ethercluster.com/etc");
  // await runTests(1919990, "https://www.ethercluster.com/etc");
  // await runTests(5000000, MAINNET);
  // await runTests(1920000, "https://www.ethercluster.com/etc"); // hard fork
  // await runTests(1920010, "https://www.ethercluster.com/etc");
  // await runTests(3000000, "https://www.ethercluster.com/etc");
  // await runTests(
  //   1900000,
  //   "wss://mainnet.infura.io/ws/v3/0e96090b2eb34ea293a23feec9594e20"
  // );
  // await runTests(
  //   1919990,
  //   "wss://mainnet.infura.io/ws/v3/0e96090b2eb34ea293a23feec9594e20"
  // );
  // await runTests(
  //   1920000,
  //   "wss://mainnet.infura.io/ws/v3/0e96090b2eb34ea293a23feec9594e20"
  // ); // hard fork
  // await runTests(
  //   1920010,
  //   "wss://mainnet.infura.io/ws/v3/0e96090b2eb34ea293a23feec9594e20"
  // );
  // await runTests(
  //   3000000,
  //   "wss://mainnet.infura.io/ws/v3/0e96090b2eb34ea293a23feec9594e20"
  // );
  // const tree = await PersistentCache.serializeDb();
  // console.log(JSON.stringify(tree));
})();
// 26.218s, cache disabled
// 27.967s, cache enabled, cold cache
//  5.720s, cache enabled, warm cached
