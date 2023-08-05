import getProvider from "../../helpers/getProvider";
import assert from "assert";
import { EthereumProvider } from "../../../src/provider";
import { Data, keccak, Quantity } from "@ganache/utils";
import { KECCAK256_NULL } from "@ethereumjs/util";
import { Trie } from "@ethereumjs/trie";
import { Account } from "@ganache/ethereum-utils";
import { Address } from "@ganache/ethereum-address";

describe("api", () => {
  describe("eth", () => {
    describe("getProof", () => {
      let provider: EthereumProvider;
      let ownerAddress: string;
      let ownerBalance: string;
      let contractAccount: Account;
      const expectedContractAccountProof = [
        "0xf901d1a0bddaa54ff11e3d79d1aa0f9df7ed9a8f9afbc0cdd35183106c0c3c377fd587cba0ab8cdb808c8303bb61fb48e276217be9770fa83ecf3f90f2234d558885f5abf180a0cb5392b1cf13d4255ffc62eec25be303d77b795bdb0e21835ded94d29323342ea0de26cb1b4fd99c4d3ed75d4a67931e3c252605c7d68e0148d5327f341bfd5283a0819ffcfd892990a1353aca015cc014a5f0fe9a4177c75753b09854730b6d8653a0c2c799b60a0cd6acd42c1015512872e86c186bcf196e85061e76842f3b7cf86080a02e0d86c3befd177f574a20ac63804532889077e955320c9361cd10b7cc6f5809a066cd3ba8af40fe37d4bfa45f61adb46466d589b337893028157f280ecc4d94f0a060ba1f8a43e38893005830b89ec3c4b560575461c3925d183e15aed75f8c6e8fa0bca2657fd15237f0fdc85c3c0739d8d7106530921b368ca73c0df81d51bcadf4a029087b3ba8c5129e161e2cb956640f4d8e31a35f3f133c19a1044993def98b61a06456f0a93d16a9f77ff0d31cf56ef090d81c2c56b12535a27c2c7c036dc8186da05a5859d83de5765b4f4dc1a4feb297d2cbc296f91d598a28ce7bc80917b0b3eba0144540d36e30b250d25bd5c34d819538742dc54c2017c4eb1fabb8e45f72759180",
        "0xf869a03b2c95fd2a6e48d2dcb37be554d03b55e31ec582b450211db4e9c3883ffac678b846f8440180a0fe26ce2b5dafd303bdbd9adbd1bbc1ef59fceea4f81c282158ab624e2fd1787da067b59c91b38bdcd65d2f8129925a939a1469b88b66ef65395d22f74476582a5f"
      ];
      const emptyMerkleRoot = Data.toString(new Trie().root());

      const contractCode =
        "0x6080604052607b60005560018060006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555034801561005657600080fd5b50610169806100666000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80636e8d4ab51461003b5780637104ddb214610059575b600080fd5b610043610077565b60405161005091906100bc565b60405180910390f35b61006161007d565b60405161006e9190610118565b60405180910390f35b60005481565b600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6000819050919050565b6100b6816100a3565b82525050565b60006020820190506100d160008301846100ad565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610102826100d7565b9050919050565b610112816100f7565b82525050565b600060208201905061012d6000830184610109565b9291505056fea26469706673582212209c21580c5505f87f9862db81d9f3aed499a5b4966d1a626e72d1a4e999576cb064736f6c634300080b0033";
      // todo: Generate contractCode from GetProof.sol. The generated code is operating system dependent (due to metadata). Differing code generates a different proof.
      // This should be solved by generating the expected Proof directly. Once this is done, most of the static assertions can be removed, as well as the deterministic wallet.
      // See https://github.com/trufflesuite/ganache/issues/3303 for more information.

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
              data: contractCode
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
        contractAccount.storageRoot = Buffer.from(
          "fe26ce2b5dafd303bdbd9adbd1bbc1ef59fceea4f81c282158ab624e2fd1787d",
          "hex"
        );
      });

      // note: these tests may fail if a hardfork or other change changes the
      // gas used/costs required to deploy the contract. If this happens, the
      // expected values will need to be updated.
      it("gets the proof without supplying `blockNumber`", async () => {
        const result = await provider.send("eth_getProof", [ownerAddress, []]);

        assert.strictEqual(result.address, ownerAddress, "Unexpected address");
        assert.strictEqual(result.balance, ownerBalance, "Unexpected balance");
        assert.strictEqual(
          result.codeHash,
          Data.toString(KECCAK256_NULL),
          "Unexpected codeHash, expected keccak hash of zero bytes"
        );
        assert.strictEqual(result.nonce, "0x1", "Unexpected nonce");
        assert.strictEqual(
          result.storageHash,
          emptyMerkleRoot,
          "Unexpected storageHash, expected root of empty merkle trie"
        );
        assert.deepStrictEqual(
          result.storageProof,
          [],
          "Unexpected storageProof"
        );
      });

      it("gets the proof for an externally owned account", async () => {
        const result = await provider.send("eth_getProof", [
          ownerAddress,
          [],
          "latest"
        ]);

        assert.strictEqual(result.address, ownerAddress, "Unexpected address");
        assert.strictEqual(result.balance, ownerBalance, "Unexpected balance");
        assert.strictEqual(
          result.codeHash,
          Data.toString(KECCAK256_NULL),
          "Unexpected codeHash, expected keccak hash of zero bytes"
        );
        assert.strictEqual(result.nonce, "0x1", "Unexpected nonce");
        assert.strictEqual(
          result.storageHash,
          emptyMerkleRoot,
          "Unexpected storageHash, expected root of empty merkle trie"
        );
        assert.deepStrictEqual(
          result.storageProof,
          [],
          "Unexpected storageProof"
        );
      });

      it("gets the proof with an explicit block number", async () => {
        const result = await provider.send("eth_getProof", [
          ownerAddress,
          [],
          "0x1"
        ]);

        assert.strictEqual(result.address, ownerAddress, "Unexpected address");
        assert.strictEqual(result.balance, ownerBalance, "Unexpected balance");
        assert.strictEqual(
          result.codeHash,
          Data.toString(KECCAK256_NULL),
          "Unexpected codeHash, expected keccak hash of zero bytes"
        );

        assert.strictEqual(result.nonce, "0x1", "Unexpected nonce");
        assert.strictEqual(
          result.storageHash,
          emptyMerkleRoot,
          "Unexpected storageHash, expected root of empty merkle trie"
        );
        assert.deepStrictEqual(
          result.storageProof,
          [],
          "Unexpected storageProof"
        );
      });

      it("gets the proof without specific storage indices", async () => {
        const result = await provider.send("eth_getProof", [
          contractAccount.address.toString(),
          [],
          "latest"
        ]);

        assert.strictEqual(
          result.address,
          contractAccount.address.toString(),
          "Unexpected address"
        );
        assert.strictEqual(
          result.balance,
          contractAccount.balance.toString(),
          "Unexpected balance"
        );
        assert.strictEqual(
          result.codeHash,
          Data.toString(contractAccount.codeHash),
          "Unexpected codeHash"
        );
        assert.strictEqual(
          result.nonce,
          contractAccount.nonce.toString(),
          "Unexpected nonce"
        );
        assert.strictEqual(
          result.storageHash,
          Data.from(contractAccount.storageRoot).toString(),
          "Unexpected storageHash"
        );
        assert.deepStrictEqual(
          result.accountProof,
          expectedContractAccountProof,
          "Unexpected accountProof"
        );
        assert.deepStrictEqual(
          result.storageProof,
          [],
          "Unexpected storageProof"
        );
      });

      it("gets the proof with specific storage index", async () => {
        const storageSlotIndices = [
          Data.toString("0x0", 32),
          Data.toString("0x1", 32)
        ];

        const result = await provider.send("eth_getProof", [
          contractAccount.address.toString(),
          storageSlotIndices,
          "latest"
        ]);

        assert.strictEqual(
          result.address,
          contractAccount.address.toString(),
          "Unexpected address"
        );
        assert.strictEqual(
          result.balance,
          contractAccount.balance.toString(),
          "Unexpected balance"
        );
        assert.strictEqual(
          result.codeHash,
          Data.from(contractAccount.codeHash).toString(),
          "Unexpected codeHash"
        );
        assert.strictEqual(
          result.nonce,
          contractAccount.nonce.toString(),
          "Unexpected nonce"
        );
        assert.strictEqual(
          result.storageHash,
          Data.from(contractAccount.storageRoot).toString(),
          "Unexpected storageHash"
        );
        assert.deepStrictEqual(
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
            value: "0x1",
            proof: [
              "0xf8518080a0a75fd430c15087d0a2c54dcfe4bfa47c13129638e5ec6ea8236bd5df2ad66ac68080808080808080a0f4984a11f61a2921456141df88de6e1a710d28681b91af794c5a721e47839cd78080808080",
              "0xe2a0310e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf601"
            ]
          }
        ];

        assert.deepStrictEqual(
          result.storageProof,
          expectedStorageProof,
          "Unexpected storageProof"
        );
      });

      it("gets the proof with unused storage indices", async () => {
        const storageSlotIndices = [Data.toString("0xff", 32)];

        const result = await provider.send("eth_getProof", [
          contractAccount.address.toString(),
          storageSlotIndices,
          "latest"
        ]);

        assert.strictEqual(
          result.address,
          contractAccount.address.toString(),
          "Unexpected address"
        );
        assert.strictEqual(
          result.balance,
          contractAccount.balance.toString(),
          "Unexpected balance"
        );
        assert.strictEqual(
          result.codeHash,
          Data.from(contractAccount.codeHash).toString(),
          "Unexpected codeHash"
        );
        assert.strictEqual(
          result.nonce,
          contractAccount.nonce.toString(),
          "Unexpected nonce"
        );
        assert.strictEqual(
          result.storageHash,
          Data.from(contractAccount.storageRoot).toString(),
          "Unexpected storageHash"
        );
        assert.deepStrictEqual(
          result.accountProof,
          expectedContractAccountProof,
          "Unexpected accountProof"
        );

        const expectedStorageProof = [
          {
            key: "0x00000000000000000000000000000000000000000000000000000000000000ff",
            value: "0x0",
            proof: [
              "0xf8518080a0a75fd430c15087d0a2c54dcfe4bfa47c13129638e5ec6ea8236bd5df2ad66ac68080808080808080a0f4984a11f61a2921456141df88de6e1a710d28681b91af794c5a721e47839cd78080808080"
            ]
          }
        ];

        assert.deepStrictEqual(
          result.storageProof,
          expectedStorageProof,
          "Unexpected storageProof"
        );
      });

      it("should return a proof for an unused address", async () => {
        const address = "0x29b8eda7d9b53ff875f098d02c5b35eed2e9628b";
        const result = await provider.send("eth_getProof", [
          address,
          [],
          "latest"
        ]);

        assert.strictEqual(result.address, address, "Unexpected address");
        assert.strictEqual(result.balance, "0x0", "Unexpected balance");
        assert.strictEqual(
          result.codeHash,
          Data.toString(KECCAK256_NULL),
          "Unexpected codeHash, expected keccak hash of zero bytes"
        );
        assert.strictEqual(result.nonce, "0x0", "Unexpected nonce");
        assert.strictEqual(
          result.storageHash,
          emptyMerkleRoot,
          "Unexpected storageHash, expected root of empty merkle trie"
        );

        const expectedAccountProof = [
          "0xf901d1a0bddaa54ff11e3d79d1aa0f9df7ed9a8f9afbc0cdd35183106c0c3c377fd587cba0ab8cdb808c8303bb61fb48e276217be9770fa83ecf3f90f2234d558885f5abf180a0cb5392b1cf13d4255ffc62eec25be303d77b795bdb0e21835ded94d29323342ea0de26cb1b4fd99c4d3ed75d4a67931e3c252605c7d68e0148d5327f341bfd5283a0819ffcfd892990a1353aca015cc014a5f0fe9a4177c75753b09854730b6d8653a0c2c799b60a0cd6acd42c1015512872e86c186bcf196e85061e76842f3b7cf86080a02e0d86c3befd177f574a20ac63804532889077e955320c9361cd10b7cc6f5809a066cd3ba8af40fe37d4bfa45f61adb46466d589b337893028157f280ecc4d94f0a060ba1f8a43e38893005830b89ec3c4b560575461c3925d183e15aed75f8c6e8fa0bca2657fd15237f0fdc85c3c0739d8d7106530921b368ca73c0df81d51bcadf4a029087b3ba8c5129e161e2cb956640f4d8e31a35f3f133c19a1044993def98b61a06456f0a93d16a9f77ff0d31cf56ef090d81c2c56b12535a27c2c7c036dc8186da05a5859d83de5765b4f4dc1a4feb297d2cbc296f91d598a28ce7bc80917b0b3eba0144540d36e30b250d25bd5c34d819538742dc54c2017c4eb1fabb8e45f72759180",
          "0xf8518080a09f433009e787104ea882024d7494d573a1907321e7edae2035ee2b9d0f1fce0880808080a0039506a93e91a1dfa150a383eb7a87abbd5fb51ea63dffbe198eb85db70b5f49808080808080808080"
        ];
        assert.deepStrictEqual(
          result.accountProof,
          expectedAccountProof,
          "Unexpected accountProof"
        );
        assert.deepStrictEqual(
          result.storageProof,
          [],
          "Unexpected storageProof"
        );
      });

      it("throws with invalid block number", async () => {
        const responseProm = provider.send("eth_getProof", [
          contractAccount.address.toString(),
          [],
          "0x5"
        ]);

        await assert.rejects(responseProm, new Error("header not found"));
      });

      it("throws with a forked network", async () => {
        const fakeMainnet = await getProvider({});
        const forkedProvider = await getProvider({
          fork: { provider: fakeMainnet as any }
        });
        const error = new Error(
          "eth_getProof is not supported on a forked network. See https://github.com/trufflesuite/ganache/issues/3234 for details."
        );

        await assert.rejects(
          forkedProvider.send("eth_getProof", [
            contractAccount.address.toString(),
            [],
            "latest"
          ]),
          error
        );
      });
    });
  });
});
