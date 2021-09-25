const { RequestCoordinator, Executor } = require("@ganache/utils");
const EthereumProvider = require("./lib/src/provider").default;
const seedrandom = require("seedrandom");

const mnemonic =
  "into trim cross then helmet popular suit hammer cart shrug oval student";

const getProvider = async (
  options = {
    wallet: { mnemonic: mnemonic }
  }
) => {
  options.chain = options.chain || {};
  options.logging = options.logging || { logger: { log: () => {} } };

  // set `asyncRequestProcessing` to `true` by default
  let doAsync = options.chain.asyncRequestProcessing;
  doAsync = options.chain.asyncRequestProcessing =
    doAsync != null ? doAsync : true;

  // don't write to stdout in tests
  if (!options.logging.logger) {
    options.logging.logger = { log: () => {} };
  }

  const requestCoordinator = new RequestCoordinator(doAsync ? 0 : 1);
  const executor = new Executor(requestCoordinator);
  const provider = new EthereumProvider(options, executor);
  await provider.initialize();
  requestCoordinator.resume();
  return provider;
};

const rand = seedrandom("seed");
function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(rand() * (max - min + 1) + min);
}
(async () => {
  const provider = await getProvider({
    wallet: { mnemonic },
    fork: {
      url:
        "https://mainnet.infura.io/v3/0e96090b2eb34ea293a23feec9594e20@13291115"
    }
  });
  const a = await provider.send("eth_accounts");

  for (let j = 0; j < 60; j++) {
    let address = "0x";
    for (let i = 0; i < 20; i++) {
      address += randomIntFromInterval(0, 255).toString(16).padStart(2, "0");
    }
    console.log(address, await provider.send("eth_getBalance", [address]));
  }
  //console.log(a);
})();
