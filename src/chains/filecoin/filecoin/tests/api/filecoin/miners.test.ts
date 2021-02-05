import assert from "assert";
import FilecoinProvider from "../../../src/provider";
import { Address } from "../../../src/things/address";
import getProvider from "../../helpers/getProvider";

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
      if (provider) {
        await provider.stop();
      }
    });

    describe("Filecoin.StateListMiners", () => {
      it("should return a single miner", async () => {
        const miners = await client.stateListMiners();
        assert.strictEqual(miners.length, 1);
        assert.strictEqual(miners[0], Address.fromId(0));
      });
    });

    describe("Filecoin.StateMinerPower", () => {
      it("should returns a nonzero power for the default miner", async () => {
        const minerPower = await client.stateMinerPower(Address.fromId(0));

        // current implementation uses the default for both of these
        assert.deepStrictEqual(minerPower.MinerPower, minerPower.TotalPower);
        assert.strictEqual(minerPower.MinerPower.RawBytePower, "1");
        assert.strictEqual(minerPower.MinerPower.QualityAdjPower, "0");
        assert.strictEqual(minerPower.HasMinPower, false);
      });

      it("should returns a zero power for other miners", async () => {
        const minerPower = await client.stateMinerPower(Address.fromId(1));

        // current implementation uses the default for both of these
        assert.deepStrictEqual(minerPower.MinerPower, minerPower.TotalPower);
        assert.strictEqual(minerPower.MinerPower.RawBytePower, "0");
        assert.strictEqual(minerPower.MinerPower.QualityAdjPower, "0");
        assert.strictEqual(minerPower.HasMinPower, false);
      });
    });

    describe("Filecoin.StateMinerInfo", () => {
      it("should return the miner info for the default miner", async () => {
        const minerInfo = await client.stateMinerInfo(Address.fromId(0));

        assert.strictEqual(minerInfo.Owner, Address.fromId(0));
        assert.strictEqual(minerInfo.Worker, Address.fromId(0));
        assert.strictEqual(minerInfo.WorkerChangeEpoch, -1);
        assert.strictEqual(minerInfo.SectorSize, 2048);
        assert.strictEqual(minerInfo.ConsensusFaultElapsed, -1);
      });

      it("should fail to retrieve miner info for other miners", async () => {
        try {
          const minerInfo = await client.stateMinerInfo(Address.fromId(1));
          assert.fail(
            `Should not have retrieved a miner info for miner ${Address.fromId(
              1
            )}, but receive: ${minerInfo}`
          );
        } catch (e) {
          if (e.code === "ERR_ASSERTION") {
            throw e;
          }
          return;
        }
      });
    });

    describe("Filecoin.ActorAddress", () => {
      it("should return the miner info for the default miner", async () => {
        const minerActorAddress = await client.actorAddress();

        assert.strictEqual(minerActorAddress, Address.fromId(0));
      });
    });
  });
});
