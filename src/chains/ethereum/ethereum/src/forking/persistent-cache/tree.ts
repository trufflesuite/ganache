import * as lexico from "../lexicographic-key-codec";
import { Data, Quantity } from "@ganache/utils";
import * as rlp from "@ganache/rlp";

/**
 * A tree: https://en.wikipedia.org/wiki/Rose_tree
 * One parent, multiple children
 */
export class Tree {
  public key: Buffer;
  public data: Buffer;
  public parent: Buffer;
  public children: Buffer[];

  constructor(
    key: Buffer,
    data: Buffer,
    parent: Buffer,
    children: Buffer[] = []
  ) {
    this.key = key;
    this.data = data;
    this.parent = parent;
    this.children = children;
  }

  public serialize() {
    return rlp.encode([this.data, this.parent, this.children]);
  }

  decodeKey() {
    return Tree.decodeKey(this.key);
  }

  static decodeKey(key: Buffer) {
    const [height, hash] = lexico.decode(key);
    return {
      height: Quantity.from(height),
      hash: Data.from(hash)
    };
  }

  static deserialize(key: Buffer, value: Buffer) {
    const [data, parent, children] = (rlp.decode(value) as unknown) as [
      Buffer,
      Buffer,
      Buffer[]
    ];
    return new Tree(key, data, parent, children);
  }

  static encodeKey(height: Quantity, hash: Data) {
    return lexico.encode([height.toBuffer(), hash.toBuffer()]);
  }
}
