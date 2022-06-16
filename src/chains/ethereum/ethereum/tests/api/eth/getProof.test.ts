import getProvider from "../../helpers/getProvider";
import assert from "assert";
import { EthereumProvider } from "../../../src/provider";
import compile, { CompileOutput } from "../../helpers/compile";
import { join } from "path";
import { Data, keccak, Quantity } from "@ganache/utils";
import { KECCAK256_NULL, rlp } from "ethereumjs-util";
import { SecureTrie } from "merkle-patricia-tree";
import { Account } from "@ganache/ethereum-utils";
import { Address } from "@ganache/ethereum-address";

describe("api", () => {
  describe("eth", () => {
    describe("getProof", () => {
      let provider: EthereumProvider;
      let contract: CompileOutput;
      let ownerAddress: string;
      let ownerBalance: string;
      let contractAccount: Account;
      const expectedContractAccountProof = [
        "0xf901d1a0bddaa54ff11e3d79d1aa0f9df7ed9a8f9afbc0cdd35183106c0c3c377fd587cba0ab8cdb808c8303bb61fb48e276217be9770fa83ecf3f90f2234d558885f5abf180a0a95ba67dcf55d051db4ddc675999682e6f4c7f8f16804b4a0216b4b9103b01c0a0de26cb1b4fd99c4d3ed75d4a67931e3c252605c7d68e0148d5327f341bfd5283a05f1672e7a13fc3d588c018f066a010bbc3c2171c0435e17af22e2429fd868917a0c2c799b60a0cd6acd42c1015512872e86c186bcf196e85061e76842f3b7cf86080a02e0d86c3befd177f574a20ac63804532889077e955320c9361cd10b7cc6f5809a066cd3ba8af40fe37d4bfa45f61adb46466d589b337893028157f280ecc4d94f0a060ba1f8a43e38893005830b89ec3c4b560575461c3925d183e15aed75f8c6e8fa0bca2657fd15237f0fdc85c3c0739d8d7106530921b368ca73c0df81d51bcadf4a029087b3ba8c5129e161e2cb956640f4d8e31a35f3f133c19a1044993def98b61a06456f0a93d16a9f77ff0d31cf56ef090d81c2c56b12535a27c2c7c036dc8186da0a390f135abc61e0c4587b388cf0ba75d5858a1b35511d9e059c42baecb00635ea0144540d36e30b250d25bd5c34d819538742dc54c2017c4eb1fabb8e45f72759180",
        "0xf869a03b2c95fd2a6e48d2dcb37be554d03b55e31ec582b450211db4e9c3883ffac678b846f8440180a0fe26ce2b5dafd303bdbd9adbd1bbc1ef59fceea4f81c282158ab624e2fd1787da0224b4f9317e44dbf233c853aa45f89db2f5b76989444a324ae9475fbed1d80a0"
      ];

      before(async () => {
        contract = compile(join(__dirname, "./contracts/GetStorageAt.sol"));
      });

      beforeEach(async () => {
        provider = await getProvider({
          miner: { defaultTransactionGasLimit: 6721975 },
          wallet: { deterministic: true }
        });
        await provider.send("eth_subscribe", ["newHeads"]);

        const accounts = await provider.send("eth_accounts");
        ownerAddress = accounts[0];

        const deployContractTxHash = await provider.send(
          "eth_sendTransaction",
          [
            {
              from: ownerAddress,
              data: contract.code
            }
          ]
        );
        await provider.once("message");

        const receipt = await provider.send("eth_getTransactionReceipt", [
          deployContractTxHash
        ]);
        ownerBalance = await provider.send("eth_getBalance", [ownerAddress]);

        contractAccount = new Account(Address.from(receipt.contractAddress));
        const deployedCode = Data.from(
          await provider.send("eth_getCode", [
            contractAccount.address.toString()
          ])
        );
        const contractHashData = Data.from(keccak(deployedCode.toBuffer()));
        const contractAccountBalance = await provider.send("eth_getBalance", [
          contractAccount.address.toString()
        ]);

        contractAccount.codeHash = contractHashData.toBuffer();
        contractAccount.nonce = Quantity.from(0x1);
        contractAccount.balance = Quantity.from(contractAccountBalance);
        contractAccount.codeHash = Buffer.from(
          "224b4f9317e44dbf233c853aa45f89db2f5b76989444a324ae9475fbed1d80a0",
          "hex"
        );
        contractAccount.stateRoot = Buffer.from(
          "fe26ce2b5dafd303bdbd9adbd1bbc1ef59fceea4f81c282158ab624e2fd1787d",
          "hex"
        );
      });

      it("gets the proof for an externally owned address", async () => {
        const result = await provider.send("eth_getProof", [
          ownerAddress,
          [],
          "latest"
        ]);

        assert.equal(result.address, ownerAddress, "Unexpected address");
        assert.equal(result.balance, ownerBalance, "Unexpected balance");
        assert.equal(
          result.codeHash,
          Data.toString(KECCAK256_NULL),
          "Unexpected codeHash, should have been keccak hash of zero bytes"
        );
        assert.equal(result.nonce, "0x1", "Unexpected nonce");

        const emptyMerkelRoot = Data.toString(new SecureTrie().root);
        assert.equal(
          result.storageHash,
          emptyMerkelRoot,
          "Unexpected storageHash"
        );
        assert.deepEqual(result.storageProof, [], "Unexpected storageProof");
      });

      it("gets the proof without specific storage indices", async () => {
        const result = await provider.send("eth_getProof", [
          contractAccount.address.toString(),
          [],
          "latest"
        ]);

        assert.equal(
          result.address,
          contractAccount.address.toString(),
          "Unexpected address"
        );
        assert.equal(
          result.balance,
          contractAccount.balance.toString(),
          "Unexpected balance"
        );
        assert.equal(
          result.codeHash,
          Data.from(contractAccount.codeHash).toString(),
          "Unexpected codeHash"
        );
        assert.equal(
          result.nonce,
          contractAccount.nonce.toString(),
          "Unexpected nonce"
        );
        assert.equal(
          result.storageHash,
          Data.from(contractAccount.stateRoot).toString(),
          "Unexpected storageHash"
        );

        assert.deepEqual(
          result.accountProof,
          expectedContractAccountProof,
          "Unexpected accountProof"
        );
        assert.deepEqual(result.storageProof, [], "Unexpected storageProof");
      });

      it("gets the proof with specific storage index", async () => {
        const storageSlotIndices = [Data.from("0x0", 32), Data.from("0x1", 32)];

        const result = await provider.send("eth_getProof", [
          contractAccount.address.toString(),
          storageSlotIndices.map(slot => slot.toString()),
          "latest"
        ]);

        assert.equal(
          result.address,
          contractAccount.address.toString(),
          "Unexpected address"
        );
        assert.equal(
          result.balance,
          contractAccount.balance.toString(),
          "Unexpected balance"
        );
        assert.equal(
          result.codeHash,
          Data.from(contractAccount.codeHash).toString(),
          "Unexpected codeHash"
        );
        assert.equal(
          result.nonce,
          contractAccount.nonce.toString(),
          "Unexpected nonce"
        );
        assert.equal(
          result.storageHash,
          Data.from(contractAccount.stateRoot).toString(),
          "Unexpected storageHash"
        );

        assert.deepEqual(
          result.accountProof,
          expectedContractAccountProof,
          "Unexpected accountProof"
        );

        const expectedStorageProof = [
          {
            key: "0x0000000000000000000000000000000000000000000000000000000000000000",
            value: "0x7b",
            proof: [
              "0xf8518080a0a75fd430c15087d0a2c54dcfe4bfa47c13129638e5ec6ea8236bd5df2ad66ac68080808080808080a0f4984a11f61a2921456141df88de6e1a710d28681b91af794c5a721e47839cd78080808080",
              "0xe2a0390decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e5637b"
            ]
          },
          {
            key: "0x0000000000000000000000000000000000000000000000000000000000000001",
            value: "0x01",
            proof: [
              "0xf8518080a0a75fd430c15087d0a2c54dcfe4bfa47c13129638e5ec6ea8236bd5df2ad66ac68080808080808080a0f4984a11f61a2921456141df88de6e1a710d28681b91af794c5a721e47839cd78080808080",
              "0xe2a0310e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf601"
            ]
          }
        ];

        assert.deepEqual(
          result.storageProof,
          expectedStorageProof,
          "Unexpected storageProof"
        );
      });

      it("throws with a forked network", async () => {
        process.env.INFURA_KEY = "ABC123";
        try {
          [
            { url: "http://0.0.0.0" },
            { network: "mainnet" },
            { provider: await getProvider() }
          ].forEach(forkConfig => {
            const opts = { fork: forkConfig };
            const forkedProvider = new EthereumProvider(opts as any, {} as any);

            const error =
              "eth_getProof is not supported on a forked network. See https://github.com/trufflesuite/ganache/issues/3234 for details.";
            assert.rejects(
              forkedProvider.send("eth_getProof", [
                contractAccount.address.toString(),
                [],
                "latest"
              ]),
              error
            );
          });
        } finally {
          delete process.env.INFURA_KEY;
        }
      });
    });
  });
});
