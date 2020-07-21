import assert from "assert";
import FilecoinProvider from "../../../src/provider";
import getProvider from "../../helpers/getProvider";

describe("api", () => {
  describe("filecoin", () => {
    let provider: FilecoinProvider;
    let accounts: string[];

    beforeEach(async () => {
      provider = await getProvider();
    });

    describe("eth_getBalance", () => {
      it("should return initial balance", async() => {
        const genesis = await provider.request("Filecoin.ChainGetGenesis");
        console.log(genesis);
        assert.strictEqual(genesis["Cids"]["/"], "bafy2bzacecgowiba5yiquglvhwjbtl74vvs7v4qhjj7dfk3tygduekr32a5r4");
      });
    });

  });
});
