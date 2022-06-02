import getProvider from "../../helpers/getProvider";
import assert from "assert";
import { EthereumProvider } from "../../../src/provider";
import compile, { CompileOutput } from "../../helpers/compile";
import { join } from "path";
import { Data, keccak, Quantity } from "@ganache/utils";
import { KECCAK256_NULL, rlp } from "ethereumjs-util";
import { SecureTrie } from "merkle-patricia-tree";
import { Trie } from "merkle-patricia-tree/dist/baseTrie";
import { Account } from "@ganache/ethereum-utils";
import { Address } from "@ganache/ethereum-address";
import Blockchain from "../../../src/blockchain";

describe("api", () => {
  describe("eth", () => {
    describe("getProof", () => {
      let provider: EthereumProvider;
      let contract: CompileOutput;
      let ownerAddress: string;
      let worldStateTrie: Trie;
      let latestBlockTrie: Trie;
      let contractAddressStorageTrie: Trie
      let contractAccount: Account;

      before(async () => {
        contract = compile(join(__dirname, "./contracts/GetStorageAt.sol"));
      });

      beforeEach(async () => {
        // todo: think about how we can access the underlying world state trie
        const blockchainFactory = (a,b,c) => {
          const blockchain = new Blockchain(a,b,c);
          blockchain.once("ready").then(() => worldStateTrie = blockchain.trie);
          return blockchain;
        };

        provider = await getProvider({
          miner: { defaultTransactionGasLimit: 6721975 },
        }, blockchainFactory);
        await provider.send("eth_subscribe", ["newHeads"]);

        const accounts = await provider.send("eth_accounts");
        ownerAddress = accounts[0];

        const deployContractTxHash = await provider.send("eth_sendTransaction", [{
            from: ownerAddress,
            data: contract.code
          }]);
        await provider.once("message");

        const receipt = await provider.send("eth_getTransactionReceipt", [
          deployContractTxHash
        ]);

        contractAccount = new Account(Address.from(receipt.contractAddress));
        const deployedCode = Data.from(await provider.send("eth_getCode", [contractAccount.address.toString()]));
        const contractHashData = Data.from(keccak(deployedCode.toBuffer()));
        contractAccount.codeHash = contractHashData.toBuffer();

        const block = await provider.send("eth_getBlockByNumber", ["latest"]);
        // todo: is there an official name for this sub-trie?
        latestBlockTrie = worldStateTrie.copy();
        latestBlockTrie.root = Data.from(block.stateRoot).toBuffer();

        const contractAccountValue = await latestBlockTrie.get(contractAccount.address.toBuffer());
        const [nonce,balance,stateRoot, codeHash] = <Buffer[]>rlp.decode(contractAccountValue as rlp.Input);
        contractAccount.nonce = Quantity.from(nonce);
        contractAccount.balance = Quantity.from(balance);
        contractAccount.codeHash = codeHash;
        contractAccount.stateRoot = stateRoot;

        contractAddressStorageTrie = latestBlockTrie.copy();
        contractAddressStorageTrie.root = contractAccount.stateRoot;

      });

      it("gets the proof for an externally owned address", async () => {
        const result = await provider.send("eth_getProof", [ ownerAddress, [], "latest" ]);

        const balance = await provider.send("eth_getBalance", [ownerAddress]);

        assert.equal(result.address, ownerAddress, "Unexpected address");
        assert.equal(result.balance, balance,  "Unexpected balance");
        assert.equal(result.codeHash, Data.from(KECCAK256_NULL).toString(), "Unexpected codeHash, should have been keccak hash of zero bytes");
        assert.equal(result.nonce, "0x1", "Unexpected nonce");

        const emptyMerkelRoot = new Data(new SecureTrie().root).toString();
        assert.equal(result.storageHash, emptyMerkelRoot, "Unexpected storageHash");
        assert.deepEqual(result.storageProof, [], "Unexpected storageProof");
      });

      it("gets the proof without specific storage indices", async () => {
        const result = await provider.send("eth_getProof", [
          contractAccount.address.toString(),
          [],
          "latest"
        ]);

        assert.equal(result.address, contractAccount.address.toString(), "Unexpected address");
        assert.equal(result.balance, contractAccount.balance.toString(),  "Unexpected balance");
        assert.equal(result.codeHash, Data.from(contractAccount.codeHash).toString(), "Unexpected codeHash");
        assert.equal(result.nonce, contractAccount.nonce.toString(), "Unexpected nonce");
        assert.equal(result.storageHash, Data.from(contractAccount.stateRoot).toString(), "Unexpected storageHash");

        const accountProof = await getProof(latestBlockTrie, contractAccount.address.toBuffer());

        assert.deepEqual(result.accountProof, accountProof, "Unexpected accountProof");
        assert.deepEqual(result.storageProof, [], "Unexpected storageProof");
      });

      it("gets the proof with specific storage index", async () => {
        const storageSlotIndices = [
          //todo: these can use the handy dandy [Data.from(0, 32), Data.from(1, 32)], once we have merged perf/json-rpc
          Data.from(Buffer.alloc(32)),
          Data.from((() => {const b = Buffer.alloc(32); b[31] = 1; return b;})())
        ];

        const result = await provider.send("eth_getProof", [
          contractAccount.address.toString(),
          storageSlotIndices.map(slot => slot.toString()),
          "latest"
        ]);

        assert.equal(result.address, contractAccount.address.toString(), "Unexpected address");
        assert.equal(result.balance, contractAccount.balance.toString(),  "Unexpected balance");
        assert.equal(result.codeHash, Data.from(contractAccount.codeHash).toString(), "Unexpected codeHash");
        assert.equal(result.nonce, contractAccount.nonce.toString(), "Unexpected nonce");
        assert.equal(result.storageHash, Data.from(contractAccount.stateRoot).toString(), "Unexpected storageHash");

        const accountProof = await getProof(latestBlockTrie, contractAccount.address.toBuffer());

        assert.deepEqual(result.accountProof, accountProof, "Unexpected accountProof");

        const expectedProofPromises = storageSlotIndices.map(async slot => ({
          key: slot.toString(),
          value: await provider.send("eth_getStorageAt", [contractAccount.address.toString(), slot.toString()]),
          proof: await getProof(contractAddressStorageTrie, slot.toBuffer())
        }));
        const proofs = await Promise.all(expectedProofPromises);

        assert.deepEqual(result.storageProof, proofs, "Unexpected storageProof");
      });


      it("throws with a forked network", async () => {
        process.env.INFURA_KEY = "ABC123";
        try {
          [
            {url: "http://0.0.0.0"},
            {network: "mainnet"},
            {provider: await getProvider()}
          ].forEach(forkConfig => {
            const opts = {fork: forkConfig};
            const forkedProvider = new EthereumProvider(opts as any, {} as any);
            
            const error = "eth_getProof is not supported on a forked network. See https://github.com/ for details";
            assert.rejects(forkedProvider.send("eth_getProof", [contractAccount.address.toString(), [], "latest"]));
          });
        } finally {
          delete process.env.INFURA_KEY;
        }
      });
    });
  });
});

async function getProof(trie: Trie, key: Buffer): Promise<string[]> {
  const {stack} = await trie.findPath(keccak(key));
  const proof = stack.map(node => Data.from(node.serialize()).toString());

  return proof;
}
