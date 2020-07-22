import Block from "./block";
import CID from "./cid";

class Tipset {
  cids: Array<Map<string, CID>>;
  blocks: Array<Block>;
  height: number;
}