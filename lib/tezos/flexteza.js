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

const b58cencode = (payload, prefix) => {
  const n = new Uint8Array(prefix.length + payload.length);
  n.set(prefix);
  n.set(payload, prefix.length);
  return bs58check.encode(Buffer.from(n, "hex"));
};

const edsk = new Uint8Array([13, 15, 58, 7]);
const edpk = new Uint8Array([13, 15, 37, 217]);
const tz1 = new Uint8Array([6, 161, 159]);

const createAccount = (seed, name, balance) => {
  const kp = sodium.crypto_sign_seed_keypair(seed);
  return {
    name: name.replace(/[^A-Za-z0-9_]+/g, "_"),
    pk: b58cencode(kp.publicKey, edpk),
    pkh: b58cencode(sodium.crypto_generichash(20, kp.publicKey), tz1),
    sk: "unencrypted:" + b58cencode(kp.privateKey.slice(0, 32), edsk),
    balance
  };
};

const generateAccounts = (number, name, balance) => {
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

const Flextesa = {
  async start(options) {
    if (!options.seed) {
      options.seed = random.randomAlphaNumericString(10, seedrandom());
    }

    const accounts = await generateAccounts(options.accounts, options.seed, options.default_balance || 1000000000000);

    console.log("");
    console.log("Available Accounts");
    console.log("==================");
    accounts.forEach((account) => {
      var line = `${account.pk} : ${account.balance} TEZ (${account.name})`;

      console.log(line);
    });
    console.log("");
    console.log("Private Keys");
    console.log("==================");

    accounts.forEach(function(account) {
      console.log(`${account.pk} (${account.name})`);
    });
    console.log("");

    const cmdAccounts = accounts
      .map((a) => {
        const cmdAccount = [a.name, a.pk, a.pkh, a.sk].join(",") + "@" + a.balance;
        return ["--no-daemons-for", a.name, "--add-bootstrap-account", cmdAccount];
      })
      .flat();

    return new Promise((resolve, reject) => {
      options = options || {};

      const args = [
        "run",
        "--rm",
        "--name",
        "flextesa-mini-archive",
        "-p",
        (options.port || "8732") + ":20000",
        "trufflesuite/flextesa-mini-archive",
        "sandbox-archive",
        "start",
        "--random-traffic",
        "any",
        "--genesis-block-hash",
        options.genesisBlockHash || "random",
        ...cmdAccounts
      ];
      const flextesa = spawn("docker", args);

      let stderr = "";
      flextesa.on("error", (err) => {
        console.error(err);
        reject(err);
      });

      flextesa.stderr.on("data", function fn(data) {
        stderr += data;
        console.log(data.toString());
        if (data.toString().includes("Randomizer")) {
          flextesa.stderr.off("data", fn);
          forge("localhost", options.port, accounts[0].pkh).then(() => {
            resolve(flextesa);

            flextesa.stdout.on("data", (data) => {
              console.log(data.toString());
            });

            flextesa.stderr.on("data", (data) => {
              console.log(data.toString());
            });
          });
        }
      });

      flextesa.on("close", (code) => {
        if (code !== 0) {
          reject(stderr);
        }
      });
    });
  },
  close() {
    return execSync("docker rm -f flextesa-mini-archive > /dev/null");
  }
};

module.exports = Flextesa;

async function forge(host, port, pkh) {
  const branchHash = (await request.get(`http://${host}:${port}/chains/main/blocks/head/hash`)).body;
  // eslint-disable-next-line no-undef
  const accountCounter = BigInt(
    (await request.get(`http://${host}:${port}/chains/main/blocks/head/context/contracts/${pkh}/counter`)).body
  );
  const protocols = (await request.get(`http://${host}:${port}/protocols`)).body;
  const protocol = protocols.pop();

  // const tx = {
  //   "contents": [{
  //     "kind": "transaction",
  //     "amount": "1",
  //     "source": pkh,
  //     "destination": pkh,
  //     "storage_limit": "0",
  //     "gas_limit": "127",
  //     "fee": "0",
  //     "counter": (accountCounter + BigInt(1)).toString()
  //   }],
  //   "branch": branchHash
  // };
  // const path = "chains/main/blocks/head/helpers/forge/operations"
  // const op = await (await request.post(`http://${host}:${port}/${path}`))
  //   .send(tx);

  console.log(branchHash, accountCounter, protocol);
}
