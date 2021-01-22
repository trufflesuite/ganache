import assert from "assert";
import FilecoinProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import getIpfsClient from "../../helpers/getIpfsClient";
import { IPFSClient } from "ipfs-http-client";
import { CID } from "../../../src/things/cid";
import { StartDealParams } from "../../../src/things/start-deal-params";
import { RootCID } from "../../../src/things/root-cid";
import { StorageMarketDataRef } from "../../../src/things/storage-market-data-ref";
import { SerializedDealInfo } from "../../../src/things/deal-info";
import { SerializedRetrievalOrder } from "../../../src/things/retrieval-order";
import BN from "bn.js";
import { SerializedQueryOffer } from "../../../src/things/query-offer";

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

        let proposal = new StartDealParams({
          data: new StorageMarketDataRef({
            transferType: "graphsync",
            root: new RootCID({
              "/": cid
            }),
            pieceCid: null,
            pieceSize: 0
          }),
          wallet: address,
          miner: miners[0],
          epochPrice: 2500n,
          minBlocksDuration: 300
        });

        let proposalCid = await client.clientStartDeal(proposal.serialize());

        assert.ok(proposalCid["/"]);
        assert(CID.isValid(proposalCid["/"]));

        let deals = await client.clientListDeals();

        assert.strictEqual(deals.length, 1);

        let deal: SerializedDealInfo = deals[0];
        assert.strictEqual(deal.ProposalCid["/"], proposalCid["/"]);
        assert.strictEqual(deal.Size, expectedSize);

        let endingBalance = await client.walletBalance(address);

        assert(new BN(endingBalance).lt(new BN(beginningBalance)));
      });
    });

    describe("Filecoin.ClientFindData, Filecoin.ClientRetrieve, and Filecoin.ClientHasLocal", () => {
      let ipfs: IPFSClient;
      let offer: SerializedQueryOffer;
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
        const order: SerializedRetrievalOrder = {
          Root: offer.Root,
          Piece: offer.Piece,
          Size: offer.Size,
          Total: offer.MinPrice,
          UnsealPrice: offer.UnsealPrice,
          PaymentInterval: offer.PaymentInterval,
          PaymentIntervalIncrease: offer.PaymentIntervalIncrease,
          Client: address,
          Miner: offer.Miner,
          MinerPeer: offer.MinerPeer
        };

        await client.clientRetrieve(order);

        // No error? Great, let's make sure it subtracted the retreival cost.

        let endingBalance = await client.walletBalance(address);
        assert(new BN(endingBalance).lt(new BN(beginningBalance)));
      });

      it("errors if we try to retrieve a file our IPFS server doesn't know about", async () => {
        let cidIMadeUp = "QmY7Yh4UquoXdL9Fo2XbhXkhBvFoLwmQUfa92pxnxjQuPU";

        let madeUpOrder: SerializedRetrievalOrder = {
          Root: {
            "/": cidIMadeUp
          },
          Piece: {
            "/": cidIMadeUp
          },
          Size: 1234,
          Total: "2468",
          UnsealPrice: "2468",
          PaymentInterval: 1048576,
          PaymentIntervalIncrease: 1048576,
          Client: address,
          Miner: "t01000",
          MinerPeer: {
            Address: "t01000",
            ID: "t01000",
            PieceCID: {
              "/": "6vuxqgevbl6irx7tymbj7o4t8bz1s5vy88zmum7flxywy1qugjfd"
            }
          }
        };

        let error: Error;

        try {
          await client.clientRetrieve(madeUpOrder);
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
