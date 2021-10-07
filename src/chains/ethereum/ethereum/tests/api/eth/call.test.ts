import assert from "assert";
import EthereumProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import compile from "../../helpers/compile";
import { join } from "path";
import { BUFFER_EMPTY, Quantity, RPCQUANTITY_EMPTY } from "@ganache/utils";
import { RETURN_TYPES, RuntimeError } from "@ganache/ethereum-utils";

const contract = compile(join(__dirname, "./contracts/EthCall.sol"), {
  contractName: "EthCall"
});

describe("api", () => {
  describe("eth", () => {
    describe("call", () => {
      let provider: EthereumProvider;
      let from, to: string;
      let contractAddress: string;
      let tx: object;

      before(async () => {
        provider = await getProvider({ wallet: { deterministic: true } });
        [from, to] = await provider.send("eth_accounts");

        await provider.send("eth_subscribe", ["newHeads"]);
        const contractHash = await provider.send("eth_sendTransaction", [
          {
            from,
            data: contract.code,
            gasLimit: "0xfffff"
          }
        ]);
        await provider.once("message");
        const receipt = await provider.send("eth_getTransactionReceipt", [
          contractHash
        ]);
        contractAddress = receipt.contractAddress;

        tx = {
          from,
          to: contractAddress,
          data: "0x3fa4f245" // code for the "value" of the contract
        };
      });

      after(async () => {
        provider && (await provider.disconnect());
      });

      it("executes a message call", async () => {
        const result = await provider.send("eth_call", [tx, "latest"]);
        // gets the contract's "value", which should be 5
        assert.strictEqual(Quantity.from(result).toNumber(), 5);
      });

      it("does not create a transaction on the chain", async () => {
        const beforeCall = await provider.send("eth_getBlockByNumber", [
          "latest"
        ]);
        await provider.send("eth_call", [tx, "latest"]);
        const afterCall = await provider.send("eth_getBlockByNumber", [
          "latest"
        ]);
        assert.strictEqual(beforeCall.number, afterCall.number);
      });

      it("allows legacy 'gasPrice' based transactions", async () => {
        const tx = {
          from,
          to: contractAddress,
          data: "0x3fa4f245",
          gasPrice: "0x1"
        };
        const result = await provider.send("eth_call", [tx, "latest"]);
        // we can still get the result when the gasPrice is set
        assert.strictEqual(Quantity.from(result).toNumber(), 5);
      });

      it("allows eip-1559 fee market transactions", async () => {
        const tx = {
          from,
          to: contractAddress,
          data: "0x3fa4f245",
          maxFeePerGas: "0xff",
          maxPriorityFeePerGas: "0xff"
        };

        const result = await provider.send("eth_call", [tx, "latest"]);
        // we can still get the result when the maxFeePerGas/maxPriorityFeePerGas are set
        assert.strictEqual(Quantity.from(result).toNumber(), 5);
      });

      it("allows gas price to be omitted", async () => {
        const result = await provider.send("eth_call", [tx, "latest"]);
        // we can get the value if no gas info is given at all
        assert.strictEqual(Quantity.from(result).toNumber(), 5);
      });

      it("rejects transactions that specify legacy and eip-1559 transaction fields", async () => {
        const tx = {
          from,
          to: contractAddress,
          data: "0x3fa4f245",
          maxFeePerGas: "0xff",
          maxPriorityFeePerGas: "0xff",
          gasPrice: "0x1"
        };
        const ethCallProm = provider.send("eth_call", [tx, "latest"]);
        await assert.rejects(
          ethCallProm,
          new Error(
            "both gasPrice and (maxFeePerGas or maxPriorityFeePerGas) specified"
          ),
          "didn't reject transaction with both legacy and eip-1559 gas fields"
        );
      });

      it("returns empty result for transactions with insufficient gas when vmErrorsOnRpcResponse is disabled", async () => {
        const tx = {
          from,
          to: contractAddress,
          data: "0x3fa4f245",
          gasLimit: "0xf"
        };
        const result = await provider.send("eth_call", [tx, "latest"]);
        // the vm errored, but since vmErrorsOnRpcResponse is disabled, we just
        // set the result to 0x
        assert.strictEqual(result, "0x");
      });

      it("rejects transactions with insufficient gas when vmErrorsOnRpcResponse is enabled", async () => {
        const vmErrorsProvider = await getProvider({
          wallet: { deterministic: true },
          chain: { vmErrorsOnRPCResponse: true }
        });
        const tx = {
          from,
          input: contract.code,
          gas: "0xf"
        };
        const ethCallProm = vmErrorsProvider.send("eth_call", [tx, "latest"]);
        const result = {
          execResult: {
            exceptionError: { error: "out of gas" },
            returnValue: BUFFER_EMPTY,
            runState: { programCounter: 0 }
          }
        } as any;
        // since vmErrorsOnRpcResponse is enabled, the vm error should propogate
        // through to here
        await assert.rejects(
          ethCallProm,
          new RuntimeError(
            RPCQUANTITY_EMPTY,
            result,
            RETURN_TYPES.RETURN_VALUE
          ),
          "didn't reject transaction with insufficient gas"
        );
      });
    });
  });
});
