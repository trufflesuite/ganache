import assert from "assert";
import FilecoinProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";
import getIpfsClient from "../../helpers/getIpfsClient";
import { IPFSClient } from "ipfs-http-client";
import { CID } from "../../../src/things/cid";
import { StartDealParams } from "../../../src/things/start-deal-params";
import { RootCID } from "../../../src/things/root-cid";
import { StorageMarketDataRef } from "../../../src/things/storage-market-data-ref";
import { DealInfo, SerializedDealInfo } from "../../../src/things/deal-info";
import { SerializedRetrievalOrder } from "../../../src/things/retrieval-order";
import BN from "bn.js";
import { SerializedQueryOffer } from "../../../src/things/query-offer";
import { SerializedFileRef } from "../../../src/things/file-ref";
import tmp from "tmp-promise";
import path from "path";
import fs from "fs";
import { Address } from "../../../src/things/address";
import { StorageDealStatus } from "../../../src/types/storage-deal-status";

const LotusRPC = require("@filecoin-shipyard/lotus-client-rpc").LotusRPC;

type LotusClient = any;

describe("api", () => {
  describe("filecoin", () => {
    let provider: FilecoinProvider;
    let client: LotusClient;
    const data = "some data";
    const expectedSize = 17;

    before(async () => {
      tmp.setGracefulCleanup();
      provider = await getProvider();
      client = new LotusRPC(provider, { schema: FilecoinProvider.Schema });
    });

    after(async () => {
      if (provider) {
        await provider.stop();
      }
    });

    describe("Filecoin.ClientStartDeal, Filecoin.ClientListDeals, Ganache.GetDealById, Filecoin.ClientGetDealInfo, and Filecoin.ClientGetDealUpdates", () => {
      let ipfs: IPFSClient;
      let currentDeal: DealInfo = new DealInfo({
        dealId: -1
      });
      const dealStatuses: StorageDealStatus[] = [];

      before(async () => {
        ipfs = getIpfsClient();
      });

      it("should start listening for deal updates", async () => {
        await client.clientGetDealUpdates(update => {
          const deal = update.data[1];
          currentDeal = new DealInfo(deal);
          dealStatuses.push(currentDeal.state);
        });
      });

      it("should accept a new deal", async () => {
        let miners = await client.stateListMiners();
        const accounts = await provider.blockchain.accountManager.getControllableAccounts();
        const address = accounts[0].address;
        let beginningBalance = await client.walletBalance(address.value);

        let result = await ipfs.add({
          content: data
        });
        let cid = result.path;

        let proposal = new StartDealParams({
          data: new StorageMarketDataRef({
            transferType: "graphsync",
            root: new RootCID({
              "/": cid
            }),
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

        // Test subscription
        assert.strictEqual(currentDeal.dealId, 1);
        assert.strictEqual(currentDeal.state, StorageDealStatus.Active);
        assert.deepStrictEqual(dealStatuses, [
          StorageDealStatus.Validating,
          StorageDealStatus.Staged,
          StorageDealStatus.ReserveProviderFunds,
          StorageDealStatus.ReserveClientFunds,
          StorageDealStatus.FundsReserved,
          StorageDealStatus.ProviderFunding,
          StorageDealStatus.ClientFunding,
          StorageDealStatus.Publish,
          StorageDealStatus.Publishing,
          StorageDealStatus.Transferring,
          StorageDealStatus.Sealing,
          StorageDealStatus.Active
        ]);

        let deals = await client.clientListDeals();

        assert.strictEqual(deals.length, 1);

        let deal: SerializedDealInfo = deals[0];
        assert.strictEqual(deal.ProposalCid["/"], proposalCid["/"]);
        assert.strictEqual(deal.Size, expectedSize);

        let endingBalance = await client.walletBalance(address.value);

        assert(new BN(endingBalance).lt(new BN(beginningBalance)));
      });

      it("retrieves deal using ID", async () => {
        const deals = await client.clientListDeals();
        assert.strictEqual(deals.length, 1);

        const deal = await provider.send({
          jsonrpc: "2.0",
          id: "0",
          method: "Ganache.GetDealById",
          params: [deals[0].DealID]
        });

        assert.deepStrictEqual(deal, deals[0]);
      });

      it("fails to retrieve invalid deal using ID", async () => {
        try {
          await provider.send({
            jsonrpc: "2.0",
            id: "0",
            method: "Ganache.GetDealById",
            params: [1337]
          });
          assert.fail("Successfully retrieved a deal for an invalid ID");
        } catch (e) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          assert(
            e.message.includes("Could not find a deal for the provided ID")
          );
        }
      });

      it("retrieves deal using CID", async () => {
        const deals = await client.clientListDeals();
        assert.strictEqual(deals.length, 1);

        const deal = await client.clientGetDealInfo(deals[0].ProposalCid);

        assert.deepStrictEqual(deal, deals[0]);
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
        const expectedMinPrice = `${expectedSize * 2}`;

        let result = await ipfs.add({
          content: data
        });

        let offers = await client.clientFindData({ "/": result.path });

        assert.strictEqual(offers.length, 1);

        offer = offers[0];

        assert.ok(offer);
        assert.strictEqual(offer.Root["/"], result.path);
        assert.strictEqual(offer.Size, expectedSize);
        assert.strictEqual(offer.MinPrice, expectedMinPrice);

        let hasLocal = await client.clientHasLocal({ "/": result.path });

        assert(hasLocal);
      });

      it("should retrieve without error, and subtract balance", async () => {
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

        const tmpObj = await tmp.dir();
        const file = path.join(tmpObj.path, "content");

        const fileRef: SerializedFileRef = {
          Path: file,
          IsCAR: false
        };

        await client.clientRetrieve(order, fileRef);

        const content = await fs.promises.readFile(file, { encoding: "utf-8" });
        assert.strictEqual(content, data);

        // No error? Great, let's make sure it subtracted the retrieval cost.

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
          Miner: Address.fromId(0, false, true).value,
          MinerPeer: {
            Address: Address.fromId(0, false, true).value,
            ID: "0",
            PieceCID: {
              "/": "6vuxqgevbl6irx7tymbj7o4t8bz1s5vy88zmum7flxywy1qugjfd"
            }
          }
        };

        const tmpObj = await tmp.dir();
        const file = path.join(tmpObj.path, "content");

        const fileRef: SerializedFileRef = {
          Path: file,
          IsCAR: false
        };

        let error: Error | undefined;

        try {
          await client.clientRetrieve(madeUpOrder, fileRef);
        } catch (e) {
          error = e;
        }

        assert.notStrictEqual(
          typeof error,
          "undefined",
          "Expected ClientRetrieve to throw an error!"
        );
        assert(error!.message.indexOf("Object not found") >= 0);

        let hasLocal = await client.clientHasLocal({ "/": cidIMadeUp });

        assert(!hasLocal);
      });
    });
  });
});
