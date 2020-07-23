//#region Imports
import Emittery from "emittery";
import {types} from "@ganache/utils";
import { Tipset } from "./things/tipset";

export default class FilecoinApi implements types.Api {
  readonly [index: string]: (...args: any) => Promise<any>;

  constructor(options: any, emitter: Emittery.Typed<undefined, "message" | "connect" | "disconnect">) {
    // Let's emit "connect" for now, just in case it's necessary. 
    emitter.emit("connect");
  }

  async "Filecoin.ChainGetGenesis"() {
    let obj:object = {
      "Cids": [
        {
          "/": "bafy2bzacecgowiba5yiquglvhwjbtl74vvs7v4qhjj7dfk3tygduekr32a5r4"
        }
      ],
      "Blocks": [
        {
          "Miner": "t00",
          "Ticket": {
            "VRFProof": "dnJmIHByb29mMDAwMDAwMHZyZiBwcm9vZjAwMDAwMDA="
          },
          "ElectionProof": {
            "VRFProof": ""
          },
          "BeaconEntries": [
            {
              "Round": 0,
              "Data": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
            }
          ],
          "WinPoStProof": null,
          "Parents": null,
          "ParentWeight": "0",
          "Height": 0,
          "ParentStateRoot": {
            "/": "bafy2bzacea377mcqloy5o5vocnej7zmkputkiat66vfggepal4oa67lrgegfu"
          },
          "ParentMessageReceipts": {
            "/": "bafy2bzaceaa43et73tgxsoh2xizd4mxhbrcfig4kqp25zfa5scdgkzppllyuu"
          },
          "Messages": {
            "/": "bafy2bzacecgw6dqj4bctnbnyqfujltkwu7xc7ttaaato4i5miroxr4bayhfea"
          },
          "BLSAggregate": null,
          "Timestamp": 1231854723,
          "BlockSig": null,
          "ForkSignaling": 0
        }
      ],
      "Height": 0
    };

    return obj;
  }

  async "Filecoin.ChainHead"() {
    let t:Tipset = new Tipset();
    return t.serialize();
  }
}