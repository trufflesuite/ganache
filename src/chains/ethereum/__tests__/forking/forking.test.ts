
import getProvider from "../helpers/getProvider";
import compile, {CompileOutput} from "../helpers/compile";
import assert from "assert";
import EthereumProvider from "../../src/provider";
import path from "path";
import { Quantity, Data } from "@ganache/utils";

describe("forking", () => {
  let contract: CompileOutput;
  let methods: Record<string, string>;

  // Note on naming: We use the term "original" here to refer to the 
  // base chain -- the chain being forked *from*. The newly-created
  // chain that represents the fokr will be called "fork" throughout. 

  let originalProvider:any;
  let originalNetworkId = Date.now();
  let originalAccounts:Array<string>;

  let forkProvider:any;
  let forkAccounts:Array<string>;
  let forkBlockNumber:number;

  before("compile contracts", async() => {
    contract = compile(path.join(__dirname, "..", "contracts", "HelloWorld.sol"));
    methods = contract.contract.evm.methodIdentifiers;
  })

  before("set up main network and deploy initial data", async() => {
    originalProvider = await getProvider({
      seed: "let's make this deterministic",
      networkId: originalNetworkId,
      defaultTransactionGasLimit: Quantity.from(6721975)
    });

    originalAccounts = await originalProvider.send("eth_accounts");

    await originalProvider.send("eth_subscribe", ["newHeads"]);

    // // Deploy initial data
    // const deploymentTransactionHash = await originalProvider.send("eth_sendTransaction", [
    //   {
    //     from: originalAccounts[0],
    //     data: contract.code
    //   }
    // ]);

    // await originalProvider.once("message");
  
    // const receipt = await originalProvider.send("eth_getTransactionReceipt", [deploymentTransactionHash]);
  })

  before("set up forked network", async() => {
    forkProvider = await getProvider({
      fork: originalProvider,
      // Do not change seed; determinism matters for these tests
      seed: "a different seed",
      defaultTransactionGasLimit: Quantity.from(6721975)
    });

    forkAccounts = await forkProvider.send("eth_accounts");
    forkBlockNumber = await forkProvider.send("eth_blockNumber");

    await forkProvider.send("eth_subscribe", ["newHeads"]);

    // const deploymentTransactionHash = await forkProvider.send("eth_sendTransaction", [
    //   {
    //     from: forkAccounts[0],
    //     data: contract.code
    //   }
    // ]);

    // await forkProvider.once("message");
  
    // const receipt = await forkProvider.send("eth_getTransactionReceipt", [deploymentTransactionHash]);
  });

  it("should create block on the forked chain who's parent is the last block on the original chain", async() => {
    // Because we (currently) mine a "genesis" block when forking, the current block immediately after
    // initialization is 1 higher than the fork_block_number. This may change in the future by:
    // https://github.com/trufflesuite/ganache-core/issues/341
    let forkBlock = await originalProvider.send("eth_getBlockByNumber", ["latest"]);
    let latestBlock = await forkProvider.send("eth_getBlockByNumber", ["latest"]);

    assert.strictEqual(Quantity.from(latestBlock.number).toNumber(), Quantity.from(forkBlock.number).toNumber() + 1);
    assert.strictEqual(latestBlock.parentHash, forkBlock.hash);
  })

  it("should pull genesis block from the original chain when using tag `earliest`", async() => {
    let originalGenesis = await originalProvider.send("eth_getBlockByNumber", ["earliest"]);
    let forkedGenesis = await forkProvider.send("eth_getBlockByNumber", ["earliest"]);

    assert.deepEqual(forkedGenesis, originalGenesis);
  })

  describe("API", () => {
    it("net_version on the forked chain should return the id of the original chain", async() => {
      const networkId = await forkProvider.send("net_version")
      assert.strictEqual(networkId, originalNetworkId.toString());
    });

    // it("eth_getTransactionCount for original chain accounts should match the same request when made on the forked chain", async() => {
    //   // Note that the forked chain generated different accounts than the original chain.
    //   // We'll check the nonce of accounts created by the main chain and ensure they're the same.
    //   for (const account of originalAccounts) {
    //     let nonceOnOriginalChain:number = await originalProvider.send("eth_getTransactionCount", [account]);
    //     let nonceOnForkedChain:number = await forkProvider.send("eth_getTransactionCount", [account]);
    //     assert.strictEqual(nonceOnForkedChain, nonceOnOriginalChain, `Nonce mismatch for account ${account}`);
    //   }
    // })
  })

});
