const assert = require("assert");
const Flextesa = require("../lib/tezos/flexteza");
const Counter = require("./contracts/flextesa/Counter");
const TruffleContract = require("@truffle/contract");

let counterContract;
let counterContractInstance;
let counterContractStorage;

before(() => {
  counterContract = TruffleContract(Counter, "tezos");
  counterContract.setProvider("http://localhost:8732");
  // set alice's wallet using alice's secretKey
  counterContract.setWallet({ secretKey: "edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq" });
});

after(() => {
  Flextesa.close();
});

describe("Flextesa", () => {
  it("should start", async() => {
    try {
      await Flextesa.start({ seed: "alice", port: 8732 });
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
  }).timeout(50000);

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
