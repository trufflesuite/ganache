import assert from "assert";
import { FilecoinProvider } from "../../../src/provider";
import { Address } from "../../../src/things/address";
import getProvider from "../../helpers/getProvider";

const LotusRPC = require("@filecoin-shipyard/lotus-client-rpc").LotusRPC;

type LotusClient = any;

describe("api", () => {
  describe("filecoin", () => {
    let provider: FilecoinProvider;
    let client: LotusClient;
    const minerAddress = Address.fromId(0, false, true);

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
        assert.strictEqual(miners[0], minerAddress.value);
      });
    });

    describe("Filecoin.StateMinerPower", () => {
      it("should returns a nonzero power for the default miner", async () => {
        const minerPower = await client.stateMinerPower(minerAddress.value);

        // current implementation uses the default for both of these
        assert.deepStrictEqual(minerPower.MinerPower, minerPower.TotalPower);
        assert.strictEqual(minerPower.MinerPower.RawBytePower, "1");
        assert.strictEqual(minerPower.MinerPower.QualityAdjPower, "0");
        assert.strictEqual(minerPower.HasMinPower, false);
      });

      it("should returns a zero power for other miners", async () => {
        const minerPower = await client.stateMinerPower(
          Address.fromId(1, false, true).value
        );

        // current implementation uses the default for both of these
        assert.deepStrictEqual(minerPower.MinerPower, minerPower.TotalPower);
        assert.strictEqual(minerPower.MinerPower.RawBytePower, "0");
        assert.strictEqual(minerPower.MinerPower.QualityAdjPower, "0");
        assert.strictEqual(minerPower.HasMinPower, false);
      });
    });

    describe("Filecoin.StateMinerInfo", () => {
      it("should return the miner info for the default miner", async () => {
        const minerInfo = await client.stateMinerInfo(minerAddress.value);

        assert.strictEqual(minerInfo.Owner, minerAddress.value);
        assert.strictEqual(minerInfo.Worker, minerAddress.value);
        assert.strictEqual(minerInfo.WorkerChangeEpoch, -1);
        assert.strictEqual(minerInfo.SectorSize, 2048);
        assert.strictEqual(minerInfo.ConsensusFaultElapsed, -1);
      });

      it("should fail to retrieve miner info for other miners", async () => {
        try {
          const otherMiner = Address.fromId(1, false, true);
          const minerInfo = await client.stateMinerInfo(otherMiner.value);
          assert.fail(
            `Should not have retrieved a miner info for miner ${otherMiner.value}, but receive: ${minerInfo}`
          );
        } catch (e: any) {
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

        assert.strictEqual(minerActorAddress, minerAddress.value);
      });
    });
  });
});
