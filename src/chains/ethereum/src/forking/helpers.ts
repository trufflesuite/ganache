import Account from "ethereumjs-account";
import { GenericProvider } from "@ganache/options";
import { Data } from "@ganache/utils";
import Tag from "../things/tags";
import BaseTrie from "merkle-patricia-tree/baseTrie";

export function getSafeBlockNumberForOriginalChain(blockNumber:number | Tag.LATEST | Tag.EARLIEST, forkBoundary:number):number {
  if (typeof blockNumber == undefined) {
    return forkBoundary;
  }

  if (blockNumber == Tag.LATEST) {
    return forkBoundary;
  }

  if (blockNumber == Tag.EARLIEST) {
    return 0;
  }

  if (blockNumber > forkBoundary) {
    return forkBoundary;
  }

  return blockNumber;
}

// This used to be called fetchAccountFromFallback. Is this new name better? 
// Note that an ethereumjs-account can represent both a vanilla account
// as well as a contract.
export async function fetchAccountFromOriginalChain(key:Buffer, trie:BaseTrie, blockNumber: number, forkBoundary: number, originalProvider:GenericProvider):Promise<Account> {
  let address = Data.from(key).toString();

  let safeBlockNumber = getSafeBlockNumberForOriginalChain(blockNumber, forkBoundary);

  let [balance, nonce, code] = await Promise.all([
    await originalProvider.send("eth_balance", [address, safeBlockNumber]),
    await originalProvider.send("eth_transactionCount", [address, safeBlockNumber]),
    await originalProvider.send("eth_getCode", [address, safeBlockNumber])
  ])

  let account = new Account({
    nonce,
    balance
  })

  // This puts the code on the trie, keyed by the hash of the code.
  // It does not actually link an account to code in the trie.
  return new Promise((resolve, reject) => {
    account.setCode(trie, code, (err:Error, _) => {
      if (err) {
        return reject(err);
      }
      resolve(account);
    })
  });
}

