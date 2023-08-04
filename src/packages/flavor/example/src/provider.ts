import {
  NotABlockchainChainInternalOptions,
  NotABlockchainChainProviderOptionsConfig,
  NotABlockchainChainProviderOptions
} from "./options";

type Account = {
  balance: bigint;
};
type Block = Map<string, Account>;

function copyState(latest: Block) {
  const block: Block = new Map();
  latest.forEach((account, address) =>
    block.set(address, { balance: account.balance })
  );
  return block;
}

/**
 * A Provider can be any interface to your blockchain you want. Ganache's
 * Ethereum flavor exposes an EIP-1193 provider interface, but you don't have
 * to do the same. You could expose Ethers.js or Web3.js interfaces, or even
 * a custom interface. The only requirement is that your connector returns a
 * `provider`.
 *
 * This example provider is ALSO the blockchain itself, if you can even call
 * it that. It stores "blocks" in memory, but you could store them in a
 * database like LevelDB, MongoDB, etc. The way state is stored is very
 * primitive and doesn't make use of Tries; you wouldn't do this in a real
 * blockchain.
 */
export class Provider {
  #blockchain: Map<bigint, Block> = new Map();
  #latestBlock: bigint;
  #options: NotABlockchainChainInternalOptions;

  getAccounts() {
    return this.#options.wallet.accounts.map(address => address);
  }

  constructor(options: NotABlockchainChainProviderOptions) {
    this.#options = NotABlockchainChainProviderOptionsConfig.normalize(options);

    const genesisBlock: Map<string, Account> = new Map();
    this.#options.wallet.accounts.forEach(address =>
      genesisBlock.set(address, {
        balance: this.#options.wallet.defaultBalance
      })
    );
    this.#blockchain.set(0n, genesisBlock);
    this.#latestBlock = 0n;
  }
  async send(method: string, params: any[]) {
    switch (method) {
      case "blockNumber":
        return this.#latestBlock;
      case "getBalance": {
        const [from, blockTag] = params;
        return this.#getBalance(from, blockTag);
      }
      case "sendFunds":
        const [from, to, strAmount] = params;
        const amount = BigInt(strAmount);
        return this.#sendFunds(from, to, amount);
      default:
        throw new Error("Unsupported method " + method);
    }
  }
  #getBalance(from: string, blockTag: string) {
    let blockNumber: bigint =
      blockTag === "latest" ? this.#latestBlock : BigInt(blockTag);
    const block = this.#blockchain.get(blockNumber);
    if (!block) {
      throw new Error(`Couldn't fetch block "${blockTag}"`);
    }

    return `0x${(block.get(from)?.balance || 0n).toString(16)}`;
  }
  #sendFunds(from: string, to: string, amount: bigint) {
    const latest = this.#blockchain.get(this.#latestBlock);
    const fromAccount = { balance: latest.get(from)?.balance || 0n };
    if (fromAccount.balance < amount) {
      throw new Error("insufficient funds");
    }

    const toAccount = { balance: latest.get(to)?.balance || 0n };

    fromAccount.balance -= amount;
    toAccount.balance += amount;

    const block: Block = copyState(latest);

    // Update the state of the block
    block.set(from, fromAccount);
    block.set(to, toAccount);

    // update the blockchain
    this.#latestBlock += 1n;
    this.#blockchain.set(this.#latestBlock, block);

    // return the state changes
    return {
      fromBalance: `0x${fromAccount.balance.toString(16)}`,
      toBalance: `0x${toAccount.balance.toString(16)}`
    };
  }
}
