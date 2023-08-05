import * as lexico from "../lexicographic-key-codec";
import { BUFFER_EMPTY, Data, Quantity } from "@ganache/utils";
import * as rlp from "@ganache/rlp";

/**
 * A tree: https://en.wikipedia.org/wiki/Rose_tree
 * One parent, multiple children
 */
export class Tree {
  public key: Buffer;
  public hash: Buffer;
  public closestKnownAncestor: Buffer;
  public closestKnownDescendants: Buffer[] = [];

  constructor(
    height: Quantity,
    hash: Data,
    closestKnownAncestor: Buffer = BUFFER_EMPTY
  ) {
    this.key = Tree.encodeKey(height, hash);
    this.hash = hash.toBuffer();
    this.closestKnownAncestor = closestKnownAncestor;
  }

  public serialize() {
    return rlp.encode([
      this.hash,
      this.closestKnownAncestor,
      this.closestKnownDescendants
    ]);
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
    const [hash, parent, children] = rlp.decode(value) as unknown as [
      Buffer,
      Buffer,
      Buffer[]
    ];
    const tree = Object.create(Tree.prototype) as Tree;
    tree.key = key;
    tree.hash = hash;
    tree.closestKnownAncestor = parent;
    tree.closestKnownDescendants = children;
    return tree;
  }

  static encodeKey(height: Quantity, hash: Data) {
    return lexico.encode([height.toBuffer(), hash.toBuffer()]);
  }
}
