import assert from "assert";
import { Data, keccak } from "@ganache/utils";
import getProvider from "../../helpers/getProvider";

describe("api", () => {
  describe("eth", () => {
    describe("signTypedData", () => {
      let accounts;
      let provider;

      // Load account.
      before(async () => {
        // Account based on https://github.com/ethereum/EIPs/blob/master/assets/eip-712/Example.js
        const acc = {
          balance: "0x0",
          secretKey: Data.toString(keccak(Buffer.from("cow", "utf8")))
        };
        provider = await getProvider({
          wallet: {
            accounts: [acc]
          }
        });
        accounts = await provider.send("eth_accounts");
      });

      it("should produce a signature whose signer can be recovered", async () => {
        const typedData = {
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" }
            ],
            Person: [
              { name: "name", type: "string" },
              { name: "wallet", type: "address" }
            ],
            Mail: [
              { name: "from", type: "Person" },
              { name: "to", type: "Person" },
              { name: "contents", type: "string" }
            ]
          },
          primaryType: "Mail",
          domain: {
            name: "Ether Mail",
            version: "1",
            chainId: 1,
            verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
          },
          message: {
            from: {
              name: "Cow",
              wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"
            },
            to: {
              name: "Bob",
              wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"
            },
            contents: "Hello, Bob!"
          }
        };

        const result = await provider.send("eth_signTypedData", [
          accounts[0],
          typedData
        ]);
        assert.strictEqual(
          result,
          "0x4355c47d63924e8a72e509b65029052eb6c299d53a04e167c5775fd466751c9d07299936d304c153f6443dfa05f40ff007d72911b6f72307f996231605b915621c"
        );
      });

      it("should produce a signature whose signer can be recovered (for arrays)", async () => {
        const typedData = {
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" }
            ],
            Person: [
              { name: "name", type: "string" },
              { name: "wallets", type: "address[]" }
            ],
            Mail: [
              { name: "from", type: "Person" },
              { name: "to", type: "Person[]" },
              { name: "contents", type: "string" }
            ],
            Group: [
              { name: "name", type: "string" },
              { name: "members", type: "Person[]" }
            ]
          },
          domain: {
            name: "Ether Mail",
            version: "1",
            chainId: 1,
            verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
          },
          primaryType: "Mail",
          message: {
            from: {
              name: "Cow",
              wallets: [
                "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
                "0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF"
              ]
            },
            to: [
              {
                name: "Bob",
                wallets: [
                  "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
                  "0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57",
                  "0xB0B0b0b0b0b0B000000000000000000000000000"
                ]
              }
            ],
            contents: "Hello, Bob!"
          }
        };

        const result = await provider.send("eth_signTypedData", [
          accounts[0],
          typedData
        ]);
        assert.strictEqual(
          result,
          "0x65cbd956f2fae28a601bebc9b906cea0191744bd4c4247bcd27cd08f8eb6b71c78efdf7a31dc9abee78f492292721f362d296cf86b4538e07b51303b67f749061b"
        );
      });
    });
  });
});
