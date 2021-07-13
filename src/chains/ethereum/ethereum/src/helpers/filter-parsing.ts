import Blockchain from "../blockchain";
import { FilterArgs, RangeFilterArgs, Tag } from "@ganache/ethereum-utils";
import { Address } from "@ganache/ethereum-address";

export function parseFilterDetails(
  filter: Pick<FilterArgs, "address" | "topics">
) {
  // `filter.address` may be a single address or an array
  const addresses = filter.address
    ? (Array.isArray(filter.address) ? filter.address : [filter.address]).map(
        a => Address.from(a.toLowerCase()).toBuffer()
      )
    : [];
  const topics = filter.topics ? filter.topics : [];
  return { addresses, topics };
}

export async function parseFilterRange(
  filter: Omit<RangeFilterArgs, "address" | "topics">,
  blockchain: Blockchain
) {
  const latestBlock = blockchain.blocks.latest.header.number;
  const fromBlock = await blockchain.blocks.getEffectiveNumber(
    filter.fromBlock || Tag.LATEST
  );
  const latestBlockNumber = latestBlock.toNumber();
  const toBlock = await blockchain.blocks.getEffectiveNumber(
    filter.toBlock || Tag.LATEST
  );
  let toBlockNumber: number;
  // don't search after the "latest" block, unless it's "pending", of course.
  if (toBlock > latestBlock) {
    toBlockNumber = latestBlockNumber;
  } else {
    toBlockNumber = toBlock.toNumber();
  }
  return {
    fromBlock,
    toBlock,
    toBlockNumber
  };
}
export async function parseFilter(
  filter: RangeFilterArgs = { address: [], topics: [] },
  blockchain: Blockchain
) {
  const { addresses, topics } = parseFilterDetails(filter);
  const { fromBlock, toBlock, toBlockNumber } = await parseFilterRange(
    filter,
    blockchain
  );

  return {
    addresses,
    fromBlock,
    toBlock,
    toBlockNumber,
    topics
  };
}
