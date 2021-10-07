import assert from "assert";
import Common from "@ethereumjs/common";
import {
  TransactionFactory,
  TypedRpcTransaction,
  TypedTransaction
} from "@ganache/ethereum-transaction";
import { EthereumOptionsConfig } from "@ganache/ethereum-options";
import { Data, Heap, Quantity } from "@ganache/utils";
import Wallet from "../src/wallet";
import TransactionPool from "../src/transaction-pool";

function findIn(
  transactionHash: Buffer,
  list: Map<string, Heap<TypedTransaction, any>>
) {
  for (let [_, transactions] of list) {
    if (transactions === undefined) continue;
    const arr = transactions.array;
    for (let i = 0; i < transactions.length; i++) {
      const tx = arr[i];
      if (tx.hash.toBuffer().equals(transactionHash)) {
        return tx;
      }
    }
  }
}

describe("transaction pool", async () => {
  let rpcTx: TypedRpcTransaction;
  let from: string;
  let secretKey: Data;
  let common: Common;
  let blockchain: any;
  let origins: Map<string, Heap<TypedTransaction>>;
  const optionsJson = { wallet: { deterministic: true } };
  const options = EthereumOptionsConfig.normalize(optionsJson);
  let futureNonceRpc, executableRpc: TypedRpcTransaction;
  before(function () {
    const wallet = new Wallet(options.wallet);
    [from] = wallet.addresses;
    secretKey = wallet.unlockedAccounts.get(from);
    rpcTx = {
      from: from,
      type: "0x2",
      maxFeePerGas: "0xffffffff",
      gasLimit: "0xffff"
    };
    executableRpc = {
      from: from,
      type: "0x2",
      maxFeePerGas: "0xffffffff",
      gasLimit: "0xffff",
      nonce: "0x0"
    };
    futureNonceRpc = {
      from: from,
      type: "0x2",
      maxFeePerGas: "0xffffff",
      gasLimit: "0xffff",
      nonce: "0x2"
    };
    common = Common.forCustomChain(
      "mainnet",
      {
        name: "ganache",
        chainId: 1337,
        comment: "Local test network",
        bootstrapNodes: []
      },
      "london"
    );
    // we're spoofing a minimial fake blockchain for the tx pool that just
    // returns an account's nonce
    blockchain = {
      accounts: {
        getNonce: async () => {
          return Quantity.from("0x0");
        }
      },
      common,
      blocks: {
        latest: { header: { baseFeePerGas: Quantity.from(875000000) } }
      }
    };
  });
  beforeEach(async function () {
    // for each test, we'll need a fresh set of origins
    origins = new Map();
  });

  it("rejects transactions whose gasLimit is greater than the block gas limit", async () => {
    // for this tx pool, we'll have the block gas limit low
    const optionsJson = { miner: { blockGasLimit: "0xff" } };
    const options = EthereumOptionsConfig.normalize(optionsJson);
    const txPool = new TransactionPool(options.miner, blockchain, origins);
    const executableTx = TransactionFactory.fromRpc(executableRpc, common);
    await assert.rejects(
      txPool.prepareTransaction(executableTx, secretKey),
      {
        code: -32000,
        message: "exceeds block gas limit"
      },
      "transaction with gas limit higher than block gas limit should have been rejected"
    );
  });
  it("rejects transactions whose gasLimit is not enough to run the transaction", async () => {
    const txPool = new TransactionPool(options.miner, blockchain);
    // the tx should have a very low gas limit to be rejected
    const lowGasRpc: TypedRpcTransaction = {
      from: from,
      type: "0x2",
      maxFeePerGas: "0xffffffff",
      gasLimit: "0xff"
    };
    const lowGasTx = TransactionFactory.fromRpc(lowGasRpc, common);
    await assert.rejects(
      txPool.prepareTransaction(lowGasTx, secretKey),
      {
        code: -32000,
        message: "intrinsic gas too low"
      },
      "transaction with gas limit that is too low to run the transaction should have been rejected"
    );
  });

  it("rejects transactions whose nonce is lower than the account nonce", async () => {
    const options = EthereumOptionsConfig.normalize({});
    // when the tx pool requests a nonce for an account, we'll always respond 1
    // so if we send a tx with nonce 0, it should reject
    const fakeNonceChain = {
      accounts: {
        getNonce: async () => {
          return Quantity.from(1);
        }
      },
      common,
      blocks: {
        latest: { header: { baseFeePerGas: Quantity.from(875000000) } }
      }
    } as any;
    const txPool = new TransactionPool(options.miner, fakeNonceChain, origins);
    const executableTx = TransactionFactory.fromRpc(executableRpc, common);
    await assert.rejects(
      txPool.prepareTransaction(executableTx, secretKey),
      {
        message: `the tx doesn't have the correct nonce. account has nonce of: 1 tx has nonce of: ${executableTx.nonce.toBigInt()}`
      },
      "transaction with nonce lower than account nonce should have been rejected"
    );
  });

  it("rejects executable replacement transactions whose gas price isn't sufficiently high", async () => {
    const txPool = new TransactionPool(options.miner, blockchain, origins);
    const executableTx = TransactionFactory.fromRpc(executableRpc, common);
    const isExecutable = await txPool.prepareTransaction(
      executableTx,
      secretKey
    );
    assert(isExecutable); // our first transaction is executable
    const { pending } = txPool.executables;
    // our executable transaction should be found in the pending queue
    const found = findIn(executableTx.hash.toBuffer(), pending);
    assert.strictEqual(
      found.serialized.toString(),
      executableTx.serialized.toString()
    );
    // the second time around, the gas price won't be high enough to replace, so it'll throw
    await assert.rejects(
      txPool.prepareTransaction(executableTx, secretKey),
      {
        code: -32003,
        message: "transaction underpriced"
      },
      "replacement transaction with insufficient gas price to replace should have been rejected"
    );
  });

  it("rejects future nonce replacement transactions whose gas price isn't sufficiently high", async () => {
    const txPool = new TransactionPool(options.miner, blockchain, origins);
    const futureNonceTx = TransactionFactory.fromRpc(futureNonceRpc, common);
    const isExecutable = await txPool.prepareTransaction(
      futureNonceTx,
      secretKey
    );
    assert(!isExecutable); // our transaction is not executable
    // our non executable transaction should be found in the origins queue
    const found = findIn(futureNonceTx.hash.toBuffer(), origins);
    assert.strictEqual(
      found.serialized.toString(),
      futureNonceTx.serialized.toString()
    );
    // now, if we resend the same transaction, since the gas price isn't higher,
    // it should be rejected
    await assert.rejects(
      txPool.prepareTransaction(futureNonceTx, secretKey),
      {
        code: -32003,
        message: "transaction underpriced"
      },
      "replacement transaction with insufficient gas price to replace should have been rejected"
    );
  });

  it("adds immediately executable transactions to the pending queue", async () => {
    const txPool = new TransactionPool(options.miner, blockchain, origins);
    const executableTx = TransactionFactory.fromRpc(executableRpc, common);
    // we aren't passing in the secretKey just for code coverage. this causes
    // a code path where a fake key is made to signAndHash
    const isExecutable = await txPool.prepareTransaction(executableTx);
    assert(isExecutable); // our first transaction is executable
    const { pending } = txPool.executables;
    // our executable transaction should be found in the pending queue
    const found = findIn(executableTx.hash.toBuffer(), pending);
    assert.strictEqual(
      found.serialized.toString(),
      executableTx.serialized.toString()
    );
  });

  it("adds future nonce transactions to the future queue", async () => {
    const txPool = new TransactionPool(options.miner, blockchain, origins);
    const futureNonceTx = TransactionFactory.fromRpc(futureNonceRpc, common);
    const isExecutable = await txPool.prepareTransaction(
      futureNonceTx,
      secretKey
    );
    assert(!isExecutable); // our transaction is not executable
    // our non executable transaction should be found in the origins queue
    const found = findIn(futureNonceTx.hash.toBuffer(), origins);
    assert.strictEqual(
      found.serialized.toString(),
      futureNonceTx.serialized.toString()
    );
  });

  it("replaces immediately executable transactions in the pending queue", async () => {
    const txPool = new TransactionPool(options.miner, blockchain, origins);
    const executableTx = TransactionFactory.fromRpc(executableRpc, common);
    const isExecutable = await txPool.prepareTransaction(
      executableTx,
      secretKey
    );
    assert(isExecutable); // our first transaction is executable
    const { pending } = txPool.executables;
    // our executable transaction should be found in the pending queue
    const found = findIn(executableTx.hash.toBuffer(), pending);
    assert.strictEqual(
      found.serialized.toString(),
      executableTx.serialized.toString()
    );

    // our replacement transaction needs to have a sufficiently higher gasPrice
    const replacementRpc: TypedRpcTransaction = {
      from: from,
      type: "0x2",
      maxFeePerGas: "0xffffffffff",
      maxPriorityFeePerGas: "0xffffffff",
      gasLimit: "0xffff",
      nonce: "0x0"
    };
    const replacementTx = TransactionFactory.fromRpc(replacementRpc, common);
    const replacementIsExecutable = await txPool.prepareTransaction(
      replacementTx,
      secretKey
    );
    assert(replacementIsExecutable); // our replacement transaction is executable
    // our replacement transaction should be found in the pending queue
    const replacementFound = findIn(replacementTx.hash.toBuffer(), pending);
    assert.strictEqual(
      replacementFound.serialized.toString(),
      replacementTx.serialized.toString()
    );

    // our replaced transaction should not be found anywhere in the pool
    const originalFound = txPool.find(executableTx.hash.toBuffer());
    assert.strictEqual(originalFound, null);
  });

  it("replaces future nonce transactions in the future queue", async () => {
    const txPool = new TransactionPool(options.miner, blockchain, origins);
    const futureNonceTx = TransactionFactory.fromRpc(futureNonceRpc, common);
    const isExecutable = await txPool.prepareTransaction(
      futureNonceTx,
      secretKey
    );
    assert(!isExecutable); // our transaction is not executable
    // our non executable transaction should be found in the origins queue
    const found = findIn(futureNonceTx.hash.toBuffer(), origins);
    assert.strictEqual(
      found.serialized.toString(),
      futureNonceTx.serialized.toString()
    );

    // our replacement transaction needs to have a sufficiently higher gasPrice
    const replacementRpc: TypedRpcTransaction = {
      from: from,
      type: "0x2",
      maxFeePerGas: "0xffffffffff",
      gasLimit: "0xffff",
      nonce: "0x2"
    };
    const replacementTx = TransactionFactory.fromRpc(replacementRpc, common);
    const replacementIsExecutable = await txPool.prepareTransaction(
      replacementTx,
      secretKey
    );
    assert(!replacementIsExecutable); // our replacement transaction is also not executable
    // our replacement transaction should be found in the origins queue
    const replacementFound = findIn(replacementTx.hash.toBuffer(), origins);
    assert.strictEqual(
      replacementFound.serialized.toString(),
      replacementTx.serialized.toString()
    );

    // our replaced transaction should not be found anywhere in the pool
    const originalFound = txPool.find(futureNonceTx.hash.toBuffer());
    assert.strictEqual(originalFound, null);
  });

  it("executes future transactions when the nonce gap is fiiled", async () => {
    const txPool = new TransactionPool(options.miner, blockchain, origins);
    const futureNonceTx = TransactionFactory.fromRpc(futureNonceRpc, common);
    const futureIsExecutable = await txPool.prepareTransaction(
      futureNonceTx,
      secretKey
    );
    assert(!futureIsExecutable); // our transaction is not executable
    // our non executable transaction should be found in the origins queue
    const foundInOrigins = findIn(futureNonceTx.hash.toBuffer(), origins);
    assert.strictEqual(
      foundInOrigins.serialized.toString(),
      futureNonceTx.serialized.toString()
    );

    // since the "future nonce" is 0x2, we need a 0x0 and a 0x1 nonce transaction
    // from this origin. queue up the 0x0 one now
    const executableTx = TransactionFactory.fromRpc(executableRpc, common);
    const isExecutable = await txPool.prepareTransaction(
      executableTx,
      secretKey
    );
    assert(isExecutable); // our first transaction is executable
    const { pending } = txPool.executables;
    // our executable transaction should be found in the pending queue
    const found = findIn(executableTx.hash.toBuffer(), pending);
    assert.strictEqual(
      found.serialized.toString(),
      executableTx.serialized.toString()
    );

    // now we'll send in transaction that will fill the gap between the queued
    // tx and the account's nonce
    // note, we're sending a transaction that doesn't have a nonce just for
    // code coverage, to hit the lines where there 1. is an executable tx already
    // and 2. a no-nonce tx is sent so the next highest nonce needs to be used
    const tx = TransactionFactory.fromRpc(rpcTx, common);
    const txIsExecutable = await txPool.prepareTransaction(tx, secretKey);
    assert(txIsExecutable); // our next transaction is executable
    // our executable transaction should be found in the pending queue
    const txFound = findIn(tx.hash.toBuffer(), pending);
    assert.strictEqual(txFound.serialized.toString(), tx.serialized.toString());

    // now, the tx pool should have automatically marked our previously "future"
    // tx as executable and moved it out of the origins queue.
    const futureInPending = findIn(futureNonceTx.hash.toBuffer(), pending);
    assert.strictEqual(
      futureInPending.serialized.toString(),
      futureNonceTx.serialized.toString()
    );
    const futureInOrigin = findIn(futureNonceTx.hash.toBuffer(), origins);
    assert.strictEqual(futureInOrigin, undefined);
  });

  it("sets the transactions nonce appropriately if omitted from the transaction", async () => {
    const txPool = new TransactionPool(options.miner, blockchain, origins);
    // we're copying the rpcTx but using the 0 address just for code coverage
    // we'll also omit the secretKey below. This will force a code path where
    // a fake key is generated for the zero address
    const newTx = JSON.parse(JSON.stringify(rpcTx));
    newTx.from = `0x0000000000000000000000000000000000000000`;
    const transaction = TransactionFactory.fromRpc(newTx, common);

    // our transaction doesn't have a nonce up front.
    assert.strictEqual(transaction.nonce.valueOf(), undefined);
    await txPool.prepareTransaction(transaction);
    // after it's prepared by the txPool, an appropriate nonce for the account is set
    assert.strictEqual(transaction.nonce.valueOf(), Quantity.from(0).valueOf());
  });

  it("can be cleared/emptied", async () => {
    const txPool = new TransactionPool(options.miner, blockchain, origins);
    const transaction = TransactionFactory.fromRpc(rpcTx, common);

    await txPool.prepareTransaction(transaction);
    const { pending } = txPool.executables;
    // our executable transaction should be found in the pending queue
    const found = findIn(transaction.hash.toBuffer(), pending);
    assert.strictEqual(
      found.serialized.toString(),
      transaction.serialized.toString()
    );

    const futureNonceTx = TransactionFactory.fromRpc(futureNonceRpc, common);
    const futureIsExecutable = await txPool.prepareTransaction(
      futureNonceTx,
      secretKey
    );
    assert(!futureIsExecutable); // our transaction is not executable
    // our non executable transaction should be found in the origins queue
    const foundInOrigins = findIn(futureNonceTx.hash.toBuffer(), origins);
    assert.strictEqual(
      foundInOrigins.serialized.toString(),
      futureNonceTx.serialized.toString()
    );

    txPool.clear();
    // both queues should be empty
    assert.strictEqual(pending.values.length, 0);
    assert.strictEqual(origins.values.length, 0);
  });

  it("emits an event when a transaction is ready to be mined", async () => {
    const txPool = new TransactionPool(options.miner, blockchain, origins);
    const transaction = TransactionFactory.fromRpc(rpcTx, common);

    await txPool.prepareTransaction(transaction);
    const drainPromise = txPool.once("drain");
    txPool.drain();
    await drainPromise;

    const { pending } = txPool.executables;
    // our executable transaction should be found in the pending queue after the drain event
    const found = findIn(transaction.hash.toBuffer(), pending);
    assert.strictEqual(
      found.serialized.toString(),
      transaction.serialized.toString()
    );
  });
});
