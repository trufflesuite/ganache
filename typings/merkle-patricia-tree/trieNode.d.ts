declare module 'merkle-patricia-tree/trieNode' {
  import BN from 'bn.js'

  type LargeNumber = string | Buffer | BN
  type Callback<T> = (err: Error | null, result: T) => void
  type NodeType = 'branch' | 'leaf' | 'extension'
  type NibbleArray = number[]

  export class TrieNode {
    value: Buffer
    key: Buffer
    type: NodeType
    raw: number[]

    constructor(type: NodeType | NibbleArray, key?: NibbleArray, value?: NibbleArray)
    parseNode(node: NibbleArray): void
    setValue(key: NibbleArray, value: NibbleArray): void
    getValue(key: NibbleArray): NibbleArray
    setKey(key: NibbleArray): void
    getKey(): NibbleArray
    serialize(): Buffer
    hash(): Buffer
    toString: string
    getChildren(): TrieNode[]
    static addHexPrefix(key: NibbleArray, terminator: boolean): NibbleArray
    static removeHexPrefix(val: NibbleArray): NibbleArray
    static isTerminator(key: NibbleArray): boolean
    static stringToNibbles(key: LargeNumber): NibbleArray
    static nibblesToBuffer(arr: NibbleArray): Buffer
    static getNodeType(node: TrieNode): NodeType
  }

  function addHexPrefix(key: NibbleArray, terminator: boolean): NibbleArray
  function removeHexPrefix(val: NibbleArray): NibbleArray
  function isTerminator(key: NibbleArray): boolean
  function stringToNibbles(key: LargeNumber): NibbleArray
  function nibblesToBuffer(arr: NibbleArray): Buffer
  function getNodeType(node: TrieNode): NodeType

  export default TrieNode
}
