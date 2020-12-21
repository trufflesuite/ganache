import assert from "assert";
import FilecoinProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import getIpfsClient from "../../helpers/getIpfsClient";
import { IPFSClient } from "ipfs-http-client";
import { CID } from "../../../src/things/cid";
import { Address } from "../../../src/things/address";
import { StorageProposal } from "../../../src/things/storage-proposal";
import { RootCID } from "../../../src/things/root-cid";
import { StorageProposalData } from "../../../src/things/storage-proposal-data";
import { SerializedDeal } from "../../../src/things/deal";
import { SerializedRetrievalOffer } from "../../../src/things/retrieval-offer";
import BN from "bn.js";

const LotusRPC = require("@filecoin-shipyard/lotus-client-rpc").LotusRPC;

type LotusClient = any;

describe("api", () => {
  describe("filecoin", () => {
    let provider: FilecoinProvider;
    let client: LotusClient;

    before(async () => {
      provider = await getProvider();
      client = new LotusRPC(provider, { schema: FilecoinProvider.Schema });
    });

    after(async () => {
      await provider.stop();
    });

    describe("General request processing", () => {
      it("should return a value over JSON RPC", async () => {
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
      it("should return a value", async () => {
        const genesis = await client.chainGetGenesis();
        assert(CID.isValid(genesis["Cids"][0]["/"]));
      });
    });

    describe("Filecoin.ChainHead", () => {
      it("should return a serialized tipset with blocks", async () => {
        const head = await client.chainHead();
        assert(head.Blocks.length > 0);
      });
    });

    describe("Filecoin.StateListMiners", () => {
      it("should return a single miner", async () => {
        const miners = await client.stateListMiners();
        assert.strictEqual(miners.length, 1);
        assert.strictEqual(miners[0], "t01000");
      });
    });

    describe("Filecoin.WalletDefaultAddress", () => {
      it("should return a single address", async () => {
        const address = await client.walletDefaultAddress();
        assert.strictEqual(address.length, 86);
        assert.strictEqual(address.indexOf("t3"), 0);
        assert(Address.isValid(address));
      });
    });

    describe("Filecoin.WalletBalance", () => {
      let address: string;

      beforeEach(async () => {
        address = await client.walletDefaultAddress();
      });

      it("should return a balance for the default address", async () => {
        const balance = await client.walletBalance(address);
        assert.strictEqual(balance, "500000000000000000000000");
      });

      it("should not return a balance for any other address", async () => {
        let otherAddress = Address.random().value;
        const balance = await client.walletBalance(otherAddress);
        assert.strictEqual(balance, "0");
      });
    });

    describe("Filecoin.ClientStartDeal and Filecoin.ClientListDeals", () => {
      let ipfs: IPFSClient;

      before(async () => {
        ipfs = getIpfsClient();
      });

      it("should accept a new deal", async () => {
        const data = "some data";
        const expectedSize = 15;

        let miners = await client.stateListMiners();
        let address = await client.walletDefaultAddress();
        let beginningBalance = await client.walletBalance(address);

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

        assert.ok(proposalCid["/"]);
        assert(CID.isValid(proposalCid["/"]));

        let deals = await client.clientListDeals();

        assert.strictEqual(deals.length, 1);

        let deal: SerializedDeal = deals[0];
        assert.strictEqual(deal.ProposalCid["/"], proposalCid["/"]);
        assert.strictEqual(deal.Size, expectedSize);

        let endingBalance = await client.walletBalance(address);

        assert(new BN(endingBalance).lt(new BN(beginningBalance)));
      });
    });

    describe("Filecoin.ClientFindData, Filecoin.ClientRetrieve, and Filecoin.ClientHasLocal", () => {
      let ipfs: IPFSClient;
      let offer: SerializedRetrievalOffer;
      let address: string;
      let beginningBalance: string;

      before(async () => {
        ipfs = getIpfsClient();

        address = await client.walletDefaultAddress();
        beginningBalance = await client.walletBalance(address);
      });

      it("should provide a remote offer", async () => {
        const data = "some data";
        const expectedSize = 15;
        const expectedMinPrice = "30";

        let result = await ipfs.add(data);

        let offers = await client.clientFindData({ "/": result.path });

        assert.strictEqual(offers.length, 1);

        offer = offers[0];

        assert.ok(offer);
        assert.strictEqual(offer.Size, expectedSize);
        assert.strictEqual(offer.MinPrice, expectedMinPrice);

        let hasLocal = await client.clientHasLocal({ "/": result.path });

        assert(hasLocal);
      });

      it("should 'retrieve' without error (but we all know it's not actually retrieving anything...), and subtract balance", async () => {
        await client.clientRetrieve(offer);

        // No error? Great, let's make sure it subtracted the retreival cost.

        let endingBalance = await client.walletBalance(address);
        assert(new BN(endingBalance).lt(new BN(beginningBalance)));
      });

      it("errors if we try to retrieve a file our IPFS server doesn't know about", async () => {
        let err: Error;

        let cidIMadeUp = "QmY7Yh4UquoXdL9Fo2XbhXkhBvFoLwmQUfa92pxnxjQuPU";

        let madeUpOffer: SerializedRetrievalOffer = {
          Err: "",
          Root: {
            "/": cidIMadeUp
          },
          Size: 1234,
          MinPrice: "2468",
          PaymentInterval: 1048576,
          PaymentIntervalIncrease: 1048576,
          Miner: "t0100",
          MinerPeerID: "6vuxqgevbl6irx7tymbj7o4t8bz1s5vy88zmum7flxywy1qugjfd"
        };

        let error: Error;

        try {
          await client.clientRetrieve(madeUpOffer);
        } catch (e) {
          error = e;
        }

        assert.notStrictEqual(
          typeof error,
          "undefined",
          "Expected ClientRetrieve to throw an error!"
        );
        assert(error.message.indexOf("Object not found") >= 0);

        let hasLocal = await client.clientHasLocal({ "/": cidIMadeUp });

        assert(!hasLocal);
      });
    });
  });
});
