const assert = require("assert");
const ganache = require("../public-exports");
const Flextesa = require("../lib/tezos/flextesa");
const Counter = require("./contracts/flextesa/Counter");
const TruffleContract = require("@truffle/contract");

let counterContract;
let counterContractInstance;
let counterContractStorage;

describe.only("Flextesa", () => {
  const port = 8732;
  const host = "localhost";
  let server;
  before(() => {
    Flextesa.close();

    counterContract = TruffleContract(Counter, "tezos");
    counterContract.setProvider(`http://${host}:${port}`);
    // set alice's wallet using alice's secretKey
    counterContract.setWallet({ secretKey: "edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq" });
  });

  after((done) => {
    server && server.close(done);
  });

  it("should start", async() => {
    try {
      server = ganache.server({ flavor: "tezos", seed: "alice" });
      return new Promise((resolve, reject) => {
        server.listen({ port, host }, (err, flextesa) => {
          if (err) {
            reject(err);
          } else {
            resolve(flextesa);
          }
        });
      });
    } catch (error) {
      assert.fail(error);
    }
  }).timeout(150000);

  it("should accept and confirm contract originations", async() => {
    try {
      counterContractInstance = await counterContract.new();

      assert(counterContractInstance, "Counter contract instance should be returned");
      assert(counterContractInstance.address, "Counter contract instance should have an address");
    } catch (error) {
      // rpc errors need to be stringified
      assert.fail(JSON.stringify(error));
    }
  }).timeout(100000);

  it("should succcesfully store contract originations", async() => {
    try {
      counterContractInstance = await counterContract.at(counterContractInstance.address);

      assert(counterContractInstance, "Counter contract instance should be returned");
    } catch (error) {
      // rpc errors need to be stringified
      assert.fail(JSON.stringify(error));
    }
  }).timeout(50000);

  it("should succcesfully store initial contract state", async() => {
    try {
      counterContractStorage = await counterContractInstance.storage();

      assert(counterContractStorage, "Counter contract storage should be returned");
      assert(counterContractStorage.toString() === "0", "Default Counter contract storage should be 0");
    } catch (error) {
      // rpc errors need to be stringified
      assert.fail(JSON.stringify(error));
    }
  }).timeout(50000);

  it("should succcesfully allow contract entrypoint interaction", async() => {
    try {
      await counterContractInstance.increment(2);
      counterContractStorage = await counterContractInstance.storage();

      assert(counterContractStorage, "Counter contract storage should be returned");
      assert(counterContractStorage.toString() === "2", "Counter contract storage should be increased to 2");

      await counterContractInstance.decrement(5);
      counterContractStorage = await counterContractInstance.storage();

      assert(counterContractStorage, "Counter contract storage should be returned");
      assert(counterContractStorage.toString() === "-3", "Counter contract storage should be decreased to -3");
    } catch (error) {
      // rpc errors need to be stringified
      assert.fail(JSON.stringify(error));
    }
  }).timeout(50000);
});
