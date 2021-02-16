import getProvider from "../../helpers/getProvider";
import assert from "assert";
import EthereumProvider from "../../../src/provider";
import Transaction from "@ethereumjs/tx/dist/legacyTransaction";
import Common from "@ethereumjs/common";
import { Data } from "@ganache/utils";

describe("api", () => {
  describe("eth", () => {
    describe("eth_sendRawTransaction*", () => {
      let secretKey =
        "0x4c3fc38239e503913706205746ef2dcc54a5ea9971988bfcac136b43e3190841";
      let provider: EthereumProvider;
      let accounts: string[];
      const common = Common.forCustomChain(
        "mainnet",
        {
          name: "ganache",
          chainId: 1337,
          comment: "Local test network",
          bootstrapNodes: []
        },
        "petersburg"
      );

      beforeEach(async () => {
        provider = await getProvider({
          wallet: {
            mnemonic: "sweet treat",
            accounts: [{ secretKey, balance: "0xffffff" }]
          }
        });
        accounts = await provider.send("eth_accounts");
      });

      it("processes a signed transaction", async () => {
        const transaction = Transaction.fromTxData(
          {
            value: "0xff",
            gasLimit: "0x33450",
            to: accounts[0]
          },
          { common }
        );

        const secretKeyBuffer = Buffer.from(secretKey.substr(2), "hex");
        const signed = transaction.sign(secretKeyBuffer);

        await provider.send("eth_subscribe", ["newHeads"]);
        const txHash = await provider.send("eth_sendRawTransaction", [
          Data.from(signed.serialize()).toString()
        ]);
        await provider.once("message");

        const receipt = await provider.send("eth_getTransactionReceipt", [
          txHash
        ]);
        assert.strictEqual(receipt.transactionHash, txHash);
      });
    });
  });
});
