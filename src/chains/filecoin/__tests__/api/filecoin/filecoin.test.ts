import assert from "assert";
import FilecoinProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import getIpfsClient from "../../helpers/getIpfsClient";
import { IPFSClient } from "ipfs-http-client";
import { CID } from "../../../src/things/cid";
import { Address } from "../../../src/things/address";
import { StorageProposal } from "../../../src/things/storageproposal";
import { RootCID } from "../../../src/things/rootcid";
import { StorageProposalData } from "../../../src/things/storageproposaldata";
import { SerializedRemoteOffer } from "../../../src/things/remoteoffer";
import { SerializedDeal } from "../../../src/things/deal";

const LotusRPC = require("@filecoin-shipyard/lotus-client-rpc").LotusRPC;

type LotusClient = any;

describe("api", () => {
  describe("filecoin", () => {
    let provider: FilecoinProvider;
    let client: LotusClient;

    before(async () => {
      provider = await getProvider();
      client = new LotusRPC(provider, {schema: FilecoinProvider.Schema});
    });

    after(async() => {
      await provider.stop();
    });

    describe("General request processing", () => {
      it("should return a value over JSON RPC", async() => {
        // Note the Filecoin Provider strips the JSON RPC details
        // from the response.
        const genesis = await provider.send({
          jsonrpc: "2.0",
          id: "0",
          method: "Filecoin.ChainGetGenesis"
        });
        

        assert(CID.isValid(genesis["Cids"][0]["/"]));
      });

      // TODO: Test for unsupported methods
    });

    describe("Filecoin.ChainGetGenesis", () => {
      it("should return a value", async() => {
        const genesis = await client.chainGetGenesis();
        assert(CID.isValid(genesis["Cids"][0]["/"]));
      });
    });
    
    describe("Filecoin.ChainHead", () => {
      it("should return a serialized tipset with blocks", async() => {
        const head = await client.chainHead();
        assert(head.Blocks.length > 0)
      })
    });

    describe("Filecoin.StateListMiners", () => {
      it("should return a single miner", async() => {
        const miners = await client.stateListMiners();
        assert.strictEqual(miners.length, 1);
        assert.strictEqual(miners[0], "t01000");
      })
    })

    describe("Filecoin.WalletDefaultAddress", () => {
      it("should return a single address", async() => {
        const address = await client.walletDefaultAddress();
        assert.strictEqual(address.length, 86);
        assert.strictEqual(address.indexOf("t3"), 0);
        assert(Address.isValid(address));
      })
    })

    describe("Filecoin.WalletBalance", () => {
      let address:string;

      beforeEach(async() => {
        address = await client.walletDefaultAddress();
      })

      it("should return a balance for the default address", async() => {
        const balance = await client.walletBalance(address);
        assert.strictEqual(balance, "500000000000000000000000");
      })

      it("should not return a balance for any other address", async() => {
        let otherAddress = new Address().value;
        const balance = await client.walletBalance(otherAddress);
        assert.strictEqual(balance, "0");
      })
    })

    describe("Filecoin.ClientStartDeal and Filecoin.ClientListDeals", () => {
      let ipfs:IPFSClient;

      before(async() => {
        ipfs = getIpfsClient();
      })

      it("should accept a new deal", async() => {
        const data = "some data"; 
        const expectedSize = 15;

        let miners = await client.stateListMiners();
        let address = await client.walletDefaultAddress();

        let result = await ipfs.add(data);
        let cid = result.path;

        let proposal = new StorageProposal({
          data: new StorageProposalData({
            transferType: "graphsync",
            root: new RootCID({
              "/": cid
            }),
            pieceCid: null,
            pieceSize: 0
          }),
          wallet: address,
          miner: miners[0],
          epochPrice: "2500",
          minBlocksDuration: 300
        });

        let proposalCid = await client.clientStartDeal(proposal.serialize());

        assert.ok(proposalCid["/"])
        assert(CID.isValid(proposalCid["/"]))

        let deals = await client.clientListDeals();

        assert.strictEqual(deals.length, 1);

        let deal:SerializedDeal = deals[0];
        assert.strictEqual(deal.ProposalCid["/"], proposalCid["/"])
        assert.strictEqual(deal.Size, expectedSize)
      })
    });

    describe("Filecoin.ClientFindData", () => {
      let ipfs:IPFSClient;

      before(async() => {
        ipfs = getIpfsClient();
      })

      it("should provide a remote offer", async() => {
        const data = "some data"; 
        const expectedSize = 15;
        const expectedMinPrice = "30";

        let result = await ipfs.add(data);

        let offers = await client.ClientFindData({"/": result.path})

        assert.strictEqual(offers.length, 1);

        let remoteOffer:SerializedRemoteOffer = offers[0];

        assert.ok(remoteOffer);
        assert.strictEqual(remoteOffer.Size, expectedSize);
        assert.strictEqual(remoteOffer.MinPrice, expectedMinPrice);
      })
    })

  });
});
