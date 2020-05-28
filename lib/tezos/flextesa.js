/* global BigInt */
/* eslint camelcase: ["error", {allow: ["chain_id", "gas_limit", "storage_limit"]}] */

const seedrandom = require("seedrandom");
const random = require("../utils/random");
const bs58check = require("bs58check");
const request = require("superagent");
const sodium = require("libsodium-wrappers");
const fs = require("fs");
const { join } = require("path");
const names = fs
  .readFileSync(join(__dirname, "names.txt"), "utf8")
  .toLowerCase()
  .split(/\n/g);
const { spawn, execSync } = require("child_process");

const prefixes = {
  edsig: new Uint8Array([9, 245, 205, 134, 18]),
  edsk: new Uint8Array([13, 15, 58, 7]),
  edpk: new Uint8Array([13, 15, 37, 217]),
  tz1: new Uint8Array([6, 161, 159])
};

const b58cencode = (payload, prefix) => {
  const n = new Uint8Array(prefix.length + payload.length);
  n.set(prefix);
  n.set(payload, prefix.length);
  return bs58check.encode(Buffer.from(n, "hex"));
};

const sign = (bytes, sk) => {
  const waterMark = new Uint8Array([3]);
  const bytesBuffer = Buffer.from(bytes, "hex");
  const markedBuf = Buffer.concat([waterMark, bytesBuffer]);
  const sig = sodium.crypto_sign_detached(sodium.crypto_generichash(32, markedBuf), sk, "uint8array");
  const edsig = b58cencode(sig, prefixes.edsig);
  const sbytes = bytes + Buffer.from(sig).toString("hex");
  return {
    bytes,
    sig,
    edsig,
    sbytes
  };
};

const createAccount = (seed, name, balance) => {
  const kp = sodium.crypto_sign_seed_keypair(seed);
  return {
    name: name.replace(/[^A-Za-z0-9_]+/g, "_"),
    pk: b58cencode(kp.publicKey, prefixes.edpk),
    pkh: b58cencode(sodium.crypto_generichash(20, kp.publicKey), prefixes.tz1),
    sk: "unencrypted:" + b58cencode(kp.privateKey.slice(0, 32), prefixes.edsk),
    fullRawSk: kp.privateKey,
    balance
  };
};

const generateAccounts = (number = 10, name, balance) => {
  const accounts = [];
  const rand = seedrandom(name);
  const usedNames = new Set();
  const getName = () => {
    let name;
    const l = names.length;
    do {
      name = names[Math.floor(rand() * l) + 0];
      if (usedNames.size > l / 2) {
        name += "_" + getName();
        break;
      }
    } while (usedNames.has(name));
    return name;
  };
  return sodium.ready.then(() => {
    for (let i = 0; i < number; i++) {
      usedNames.add(name);
      const seed = Buffer.from(name.repeat(42)).slice(0, 32);
      const gaccount = createAccount(seed, name, balance);
      accounts.push(gaccount);
      name = getName();
    }
    return accounts;
  });
};

const bake = (flextesa) => {
  return new Promise((resolve) => {
    flextesa.stderr.on("data", function fn(data) {
      if (data.toString().includes("Flextesa: Please enter command:")) {
        flextesa.stderr.removeListener("data", fn);
        resolve();
      }
    });
    flextesa.stdin.write("client-0 bake for ganache --minimal-timestamp\n");
  });
};

let closed = true;
const Flextesa = {
  async start(options = {}) {
    options = options || {};
    const logger = (options.logger = options.logger || { log: () => {} });

    if (!options.seed) {
      options.seed = random.randomAlphaNumericString(10, seedrandom());
    }
    options.port = options.port || "8732";
    options.accounts = options.accounts === undefined ? 10 : options.accounts;

    const accounts = await generateAccounts(options.accounts, options.seed, options.default_balance || 1000000000000);

    logger.log("");
    logger.log("Available Accounts");
    logger.log("==================");
    accounts.forEach((account) => {
      var line = `${account.pk} : ${account.balance} TEZ (${account.name})`;

      logger.log(line);
    });
    logger.log("");
    logger.log("Private Keys");
    logger.log("==================");

    accounts.forEach(function(account) {
      logger.log(`${account.pk} (${account.name})`);
    });
    logger.log("");

    const formatAccount = (a) => [a.name, a.pk, a.pkh, a.sk].join(",") + "@" + a.balance;
    const ganacheAccounts = await generateAccounts(1, "ganache", 1000000000000);
    const cmdAccounts = [...accounts]
      .map((a) => {
        const cmdAccount = formatAccount(a);
        return ["--add-bootstrap-account", cmdAccount, "--no-daemons-for", a.name];
      })
      .reduce((acc, arr) => {
        acc.push(...arr);
        return acc;
      }, []);

    // enable baking for ganache (we allow its daemon to start)
    // TODO: we may want to use the feature that allows baking on demand for the other accounts, too
    cmdAccounts.push("--add-bootstrap-account", formatAccount(ganacheAccounts[[0]]));

    return new Promise((resolve, reject) => {
      options = options || {};

      const port = options.port;
      const host = "localhost";

      const args = [
        "run",
        "-i",
        "--rm",
        "--name",
        "flextesa-mini-archive",
        "-p",
        port + ":20000",
        "trufflesuite/flextesa-mini-archive",
        "sandbox-archive",
        "start",
        "--genesis-block-hash",
        options.genesisBlockHash || "random",
        ...cmdAccounts
      ];
      const opts = {}; // { stdio: [process.stdin] };
      const flextesa = spawn("docker", args, opts);

      flextesa.rpc = async(method, data) => {
        if (closed) {
          return;
        }

        method = method.replace(/^\/+/, "");
        const base = `http://${host}:${port}`;
        const path = `${base}/${method}`;
        try {
          if (data) {
            return (
              await request
                .post(path)
                .type("application/json")
                .send(data)
            ).body;
          } else {
            return (await request.get(path)).body;
          }
        } catch (e) {
          if (!closed) {
            throw e;
          }
        }
      };

      let stderr = "";
      function onErrored(err) {
        flextesa.removeListener("close", onClosed);
        reject(err);
      }
      function onClosed(code) {
        flextesa.removeListener("error", onErrored);
        if (code !== 0) {
          reject(stderr);
        }
      }
      flextesa.on("error", onErrored);
      flextesa.on("close", onClosed);
      console.log("got here");

      flextesa.stderr.on("data", function fn(data) {
        stderr += data;
        logger.log(data.toString());
        if (data.toString().includes("Flextesa: Please enter command:")) {
          closed = false;
          flextesa.removeListener("close", onClosed);
          flextesa.removeListener("error", reject);
          flextesa.stderr.removeListener("data", fn);

          flextesa.on("close", () => {
            closed = true;
          });

          flextesa.stdout.on("data", (data) => {
            logger.log(data.toString());
          });

          flextesa.stderr.on("data", (data) => {
            logger.log(data.toString());
          });

          // we must forge and bake an initial block because
          // taquito can't handle empty blocks. We do this by sending the
          // "ganache" address some of its own tezzies.
          const account = ganacheAccounts[0];
          forge(flextesa, account.pkh, account.fullRawSk)
            .then((_forged) => bake(flextesa))
            .then(() => {
              // this just checks for new operations that are ready to be baked
              // and this it bakes them when found. This polls as fast as it can
              // and thus may cause CPU usage problems.
              const recursiveBake = async() => {
                if (closed) {
                  return;
                }
                const pending = await flextesa.rpc("/chains/main/mempool/pending_operations");
                if (pending && pending.applied && pending.applied.length > 0) {
                  return bake(flextesa).then(recursiveBake);
                } else {
                  Promise.resolve().then(recursiveBake);
                }
              };
              recursiveBake();

              resolve(flextesa);
            })
            .catch(reject);
        }
      });
    });
  },
  async close(callback) {
    closed = true;
    try {
      // force close
      execSync("docker rm -f flextesa-mini-archive");
    } catch (e) {}
    callback && callback();
  }
};

module.exports = Flextesa;

async function forge(flextesa, pkh, sk) {
  const { rpc } = flextesa;
  // From:
  //  https://www.ocamlpro.com/2018/11/15/an-introduction-to-tezos-rpcs-a-basic-wallet/
  //  https://www.ocamlpro.com/2018/11/21/an-introduction-to-tezos-rpcs-signing-operations/
  async function getHeadHash() {
    return rpc("/chains/main/blocks/head/hash");
  }

  async function getChainId() {
    return rpc("/chains/main/chain_id");
  }

  // eslint-disable-next-line camelcase
  let [accountCounter, constants, branch, chain_id] = await Promise.all([
    // 0
    rpc(`/chains/main/blocks/head/context/contracts/${pkh}/counter`).then((a) => BigInt(a)),
    // 3
    rpc("/chains/main/blocks/head/context/constants"),
    // 4
    getHeadHash(),
    // 5
    getChainId()
  ]);

  const operation = {
    branch,
    contents: [
      {
        kind: "transaction",
        source: pkh,
        fee: "50000",
        counter: (accountCounter + BigInt(1)).toString(),
        gas_limit: constants.hard_gas_limit_per_operation,
        storage_limit: constants.hard_storage_limit_per_operation,
        amount: "1",
        destination: pkh
      }
    ]
  };
  async function getHexTx(tx) {
    const forgeRpc = "/chains/main/blocks/head/helpers/forge/operations";
    return rpc(forgeRpc, tx);
  }
  operation.signature = sign(await getHexTx(operation), sk).edsig;

  // 6 (simulation)
  const runOp = "/chains/main/blocks/head/helpers/scripts/run_operation";
  const simulation = await rpc(runOp, {
    operation,
    chain_id
  });

  [branch, chain_id] = await Promise.all([
    // 7
    getHeadHash(),
    // 8
    getChainId()
  ]);

  // 9
  const operations = [
    {
      branch,
      contents: [
        {
          kind: "transaction",
          source: operation.contents[0].source,
          fee: operation.contents[0].fee,
          counter: operation.contents[0].counter,
          gas_limit: (BigInt(simulation.contents[0].metadata.operation_result.consumed_gas) + BigInt(100)).toString(),
          storage_limit: "0",
          amount: operation.contents[0].amount,
          destination: operation.contents[0].destination
        }
      ]
    }
  ];

  const signatures = sign(await getHexTx(operations[0]), sk);

  const protocol = "PsCARTHAGazKbHtnKfLzQg3kms52kSRpgnDY982a9oYsSXRLQEb";
  operations[0].signature = signatures.edsig;
  operations[0].protocol = protocol;
  const preApplyRpc = "/chains/main/blocks/head/helpers/preapply/operations";
  await rpc(preApplyRpc, operations);

  // 10
  const inject = await rpc("/injection/operation", JSON.stringify(signatures.sbytes));

  return inject;
}
