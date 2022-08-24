import { Block } from "@ganache/ethereum-block";
import { Quantity } from "@ganache/utils";
import { Address as EthereumJsAddress } from "ethereumjs-util";
import { isDeepStrictEqual } from "util";
import Blockchain from "../../src/blockchain";
import { GanacheTrie } from "@ganache/ethereum-utils";

/**
 * Gets all underlying data in a trie's database.
 * @param trie
 * @returns
 */
const getDbData = async (trie: GanacheTrie) => {
  const dbData: (string | Buffer)[] = [];
  for await (const data of trie.db._leveldb.createReadStream()) {
    dbData.push(data);
  }
  return dbData;
};

/**
 * Gets the trie, db data, blocks from earliest to latest, and account data from
 * the provided blockchain and addresses.
 * @param blockchain
 * @param fromAddress
 * @param toAddress
 * @returns
 */
const getBlockchainState = async (
  blockchain: Blockchain,
  addresses: EthereumJsAddress[]
) => {
  const trie = blockchain.trie.copy(true);
  // get all of the data in the trie so we can compare the underlying data
  // and not just the trie root.
  const trieDbData = await getDbData(trie);
  const vm = await blockchain.createVmFromStateTrie(
    trie,
    false,
    false,
    blockchain.common
  );
  const addressStates = [];
  for (const address of addresses) {
    addressStates.push(await vm.stateManager.getAccount(address));
  }
  const blocks: Block[] = [];
  const latest = await blockchain.blocks.get("latest");
  const number = latest.header.number.toBigInt();
  for (let i = 0n; i < number; i++) {
    blocks.push(await blockchain.blocks.get(Quantity.toString(i)));
  }
  blocks.push(latest);
  return { root: trie.root, db: trieDbData, addressStates, blocks };
};

/**
 * Gets trie, db data, and blocks from `blockchain` and account data from each
 * address of `addresses` before and after running `testFunction`. Returns
 * whether the data is `deepStrictEqual` or not.
 * @param blockchain
 * @param addresses
 * @param testFunction
 * @returns Boolean indicating whether the states are `deepStrictEqual` or not.
 */
export const statesAreDeepStrictEqual = async (
  blockchain: Blockchain,
  addresses: EthereumJsAddress[],
  testFunction: () => void
) => {
  const before = await getBlockchainState(blockchain, addresses);
  await testFunction();
  const after = await getBlockchainState(blockchain, addresses);
  return isDeepStrictEqual(before, after);
};
