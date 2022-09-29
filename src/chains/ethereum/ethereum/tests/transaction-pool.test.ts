import assert from "assert";
import Common from "@ethereumjs/common";
import {
  EIP1559FeeMarketRpcTransaction,
  TransactionFactory,
  Transaction,
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
  let rpcTx: Transaction;
  let from: string;
  let addresses: string[] = [];
  let secretKey: Data;
  let common: Common;
  let blockchain: any;
  let origins: Map<string, Heap<TypedTransaction>>;
  const priceBump = 10n;
  const optionsJson = {
    wallet: { deterministic: true },
    miner: { priceBump: priceBump }
  };
  const options = EthereumOptionsConfig.normalize(optionsJson);
  let futureNonceRpc, executableRpc: Transaction;

  const beforeEachSetup = () => {
    const wallet = new Wallet(options.wallet);
    addresses = wallet.addresses;
    [from] = addresses;
    secretKey = wallet.unlockedAccounts.get(from);
    rpcTx = {
      from: from,
      type: "0x2",
      maxFeePerGas: "0xffffffff",
      maxPriorityFeePerGas: "0xff",
      gasLimit: "0xffff"
    };
    executableRpc = {
      from: from,
      type: "0x2",
      maxFeePerGas: "0xffffffff",
      maxPriorityFeePerGas: "0xff",
      gasLimit: "0xffff",
      nonce: "0x0"
    };
    futureNonceRpc = {
      from: from,
      type: "0x2",
      maxFeePerGas: "0xffffff",
      maxPriorityFeePerGas: "0xff",
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
    // we're spoofing a minimal fake blockchain for the tx pool that just
    // returns an account's nonce
    blockchain = {
      accounts: {
        getNonceAndBalance: async () => {
          return {
            nonce: Quantity.from("0x0"),
            // 1000 ether
            balance: Quantity.from("0x3635c9adc5dea00000")
          };
        }
      },
      common,
      blocks: {
        latest: { header: { baseFeePerGas: Quantity.from(875000000) } }
      }
    };

    origins = new Map();
  };

  describe("rejections", async () => {
    beforeEach(beforeEachSetup);
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
      const lowGasRpc: Transaction = {
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
          getNonceAndBalance: async () => {
            return { nonce: Quantity.from(1), balance: Quantity.from(1e15) };
          }
        },
        common,
        blocks: {
          latest: { header: { baseFeePerGas: Quantity.from(875000000) } }
        }
      } as any;
      const txPool = new TransactionPool(
        options.miner,
        fakeNonceChain,
        origins
      );
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

      const replacementRpc = JSON.parse(JSON.stringify(executableRpc));
      replacementRpc.maxPriorityFeePerGas = "0xffff";
      const replacementTx1 = TransactionFactory.fromRpc(replacementRpc, common);
      // even if the tip is high enough, the max fee isn't enough to replace, so it'll throw
      await assert.rejects(
        txPool.prepareTransaction(replacementTx1, secretKey),
        {
          code: -32003,
          message: "transaction underpriced"
        },
        "replacement transaction with insufficient gas price to replace should have been rejected"
      );

      replacementRpc.maxPriorityFeePerGas = executableRpc.maxPriorityFeePerGas;
      replacementRpc.maxFeePerGas = "0xffffffffff";
      const replacementTx2 = TransactionFactory.fromRpc(replacementRpc, common);
      // even if the maxFee is high enough, the tip isn't enough to replace, so it'll throw
      await assert.rejects(
        txPool.prepareTransaction(replacementTx2, secretKey),
        {
          code: -32003,
          message: "transaction underpriced"
        },
        "replacement transaction with insufficient gas price to replace should have been rejected"
      );

      const legacyReplacementRpc: Transaction = {
        from: from,
        type: "0x0",
        gasPrice: "0xffffffff",
        gasLimit: "0xffff",
        nonce: "0x0"
      };
      const replacementTx3 = TransactionFactory.fromRpc(
        legacyReplacementRpc,
        common
      );
      // the gasPrice is higher than the tip but lower than the maxFee, which isn't enough, so it'll throw
      await assert.rejects(
        txPool.prepareTransaction(replacementTx3, secretKey),
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

    it("rejects transactions whose potential cost is more than the account's balance", async () => {
      const expensiveRpc: EIP1559FeeMarketRpcTransaction = {
        from,
        type: "0x2",
        value: "0xfffffffffffffffffff",
        maxFeePerGas: "0xffffff",
        maxPriorityFeePerGas: "0xff",
        gasLimit: "0xffff"
      };
      const txPool = new TransactionPool(options.miner, blockchain, origins);
      const expensiveTx = TransactionFactory.fromRpc(expensiveRpc, common);
      await assert.rejects(
        txPool.prepareTransaction(expensiveTx, secretKey),
        {
          code: -32003,
          message: "insufficient funds for gas * price + value"
        },
        "transaction whose potential cost is more than the account's balance should have been rejected"
      );
    });
  });

  describe("regular operation", async () => {
    beforeEach(beforeEachSetup);
    it("adds immediately executable transactions to the pending queue", async () => {
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

      // raise our replacement transaction's prices by exactly the price bump amount
      const originalMaxFee = Quantity.toBigInt(executableRpc.maxFeePerGas);
      const originalTip = Quantity.from(
        executableRpc.maxPriorityFeePerGas
      ).toBigInt();
      const maxFeePremium =
        originalMaxFee + (originalMaxFee * priceBump) / 100n;
      const tipPremium = originalTip + (originalTip * priceBump) / 100n;
      // our replacement transaction needs to have a sufficiently higher gasPrice
      const replacementRpc: Transaction = {
        from: from,
        type: "0x2",
        maxFeePerGas: Quantity.toString(maxFeePremium),
        maxPriorityFeePerGas: Quantity.toString(tipPremium),
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
      const replacementRpc: Transaction = {
        from: from,
        type: "0x2",
        maxFeePerGas: "0xffffffffff",
        maxPriorityFeePerGas: "0xffff",
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

    it("executes future transactions when the nonce gap is filled", async () => {
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
      assert.strictEqual(
        txFound.serialized.toString(),
        tx.serialized.toString()
      );

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

    it("can be cleared/emptied", async () => {
      const txPool = new TransactionPool(options.miner, blockchain, origins);
      const transaction = TransactionFactory.fromRpc(rpcTx, common);

      await txPool.prepareTransaction(transaction, secretKey);
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

      await txPool.prepareTransaction(transaction, secretKey);
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

    /**
     * The plan is to queue up some transactions (from the same origin) without
     * awaiting them. We'll loop over each of the subsequent promises and await
     * them in the order they were sent. Once one is awaited, confirm that it is
     * now in the pending queue, and that those promises which we _haven't_ yet
     * awaited are _not_ yet in the queue (we actually check if they've been
     * hashed yet, because this happens right before they're added to the queue)
     */
    it("adds same-origin transactions in series", async () => {
      const txPool = new TransactionPool(options.miner, blockchain, origins);
      const { pending } = txPool.executables;
      const promises: Map<TypedTransaction, Promise<any>> = new Map();
      const notInPool: TypedTransaction[] = [];

      for (let i = 0; i < 10; i++) {
        const transaction = TransactionFactory.fromRpc(rpcTx, common);
        promises.set(
          transaction,
          txPool.prepareTransaction(transaction, secretKey)
        );
        notInPool.push(transaction);
      }

      notInPool.reverse();
      for (const [transaction, promise] of promises.entries()) {
        const isExecutable = await promise;
        assert(isExecutable);
        const found = findIn(transaction.hash.toBuffer(), pending);
        assert.strictEqual(found.hash, transaction.hash);
        notInPool.pop();
        for (const unpooled of notInPool) {
          // the transaction hasn't been signed and hashed yet cause it hasn't
          // been through the pool
          assert.strictEqual(unpooled.hash, undefined);
        }
      }
    });

    /**
     * The plan is to queue up some transactions (from unique origins) and wait
     * for _any one_ of them to be done. We'll then loop (backwards, so the most
     * recently sent transaction is checked first) over each of the transactions
     * and confirm that they are in the pending executables pool, even though we
     * haven't technically awaited them. Because they are queued in parallel, w
     * hen one is done, they should all be done.
     *
     * Note: Obviously this reasoning breaks down eventually, but the test timed
     * out from too many transactions before it failed.
     *
     */
    it("adds unique-origin transactions in parallel", async () => {
      const txPool = new TransactionPool(options.miner, blockchain, origins);
      const { pending } = txPool.executables;
      const promises = [];
      const transactions: TypedTransaction[] = [];

      for (let i = 0; i < 10; i++) {
        const uniqueOrigin = addresses[i];
        const transaction = TransactionFactory.fromRpc(
          { ...rpcTx, from: uniqueOrigin },
          common
        );
        promises.push(txPool.prepareTransaction(transaction, secretKey));
      }
      await Promise.race(promises);
      for (let i = transactions.length - 1; i >= 0; i--) {
        const transaction = transactions[i];
        const found = findIn(transaction.hash.toBuffer(), pending);
        assert.strictEqual(found.hash, transaction.hash);
      }
    });
  });

  describe("nonce generation and validation", async () => {
    beforeEach(beforeEachSetup);

    /**
     * Adds transaction to pool. If location is "pending", verifies that the
     * transaction is executable and is in the pending executables. If "queued",
     * verifies that the transaction is not executable and is in the queued pool
     * @param txPool
     * @param transaction
     * @param secretKey
     * @param location
     */
    const addTxToPoolAndVerify = async (
      txPool: TransactionPool,
      transaction: TypedTransaction,
      secretKey: Data,
      location: "pending" | "queued"
    ) => {
      const isExecutable = await txPool.prepareTransaction(
        transaction,
        secretKey
      );
      let found: TypedTransaction;
      if (location === "pending") {
        assert(isExecutable);
        // our transaction should be executable and found in the pending queue
        const { pending } = txPool.executables;
        found = findIn(transaction.hash.toBuffer(), pending);
      } else {
        // our transaction should not be executable and found in the queued pool
        const origins = txPool.origins;
        assert(!isExecutable);
        found = findIn(transaction.hash.toBuffer(), origins);
      }
      assert.strictEqual(
        found.serialized.toString(),
        transaction.serialized.toString()
      );
    };

    /**
     * Adds a transaction to the pending pool and "drains" the pool, causing
     * the transaction to move from pending to inProgress.
     * @param txPool
     * @returns
     */
    const addTxToInProgress = async (txPool: TransactionPool) => {
      const transaction = TransactionFactory.fromRpc(rpcTx, common);
      const { pending, inProgress } = txPool.executables;

      const isExecutable = await txPool.prepareTransaction(
        transaction,
        secretKey
      );
      assert(isExecutable); // this tx will need to be executable to be moved to inProgress
      const drainPromise = txPool.on("drain", () => {
        // when a transaction is run, the miner removes the transaction from the
        // pending queue and adds it to the inProgress pool. There is a lag
        // between running the transaction and saving the block, which can cause
        // a race condition for nonce generation. we will make this lag infinite
        // here, because we never save the block. If the account's nonce is looked
        // up, it will not have changed, so the pool will have to rely on the
        // inProgress transactions to set the nonce of the next transaction
        const pendingOrigin = pending.get(from);
        const inProgressOrigin = inProgress.get(from);
        const data = {
          transaction,
          originBalance: Quantity.from("0x3635c9adc5dea00000")
        };
        if (inProgressOrigin) {
          inProgressOrigin.add(data);
        } else {
          inProgress.set(from, new Set([data]));
        }
        pendingOrigin.removeBest();
      });
      txPool.drain();
      await drainPromise;
      return transaction.nonce;
    };

    describe("with no pending/inProgress transactions from the account", async () => {
      const accountNonce = 1;
      beforeEach(() => {
        blockchain.accounts.getNonceAndBalance = async () => {
          return {
            // have different starting nonce for these tests
            nonce: Quantity.from(accountNonce),
            // 1000 ether
            balance: Quantity.from("0x3635c9adc5dea00000")
          };
        };
      });

      it("generates a nonce equal to the account's transaction count", async () => {
        const txPool = new TransactionPool(options.miner, blockchain, origins);
        const transaction = TransactionFactory.fromRpc(rpcTx, common);
        assert(transaction.nonce.isNull());

        await txPool.prepareTransaction(transaction, secretKey);

        assert.deepStrictEqual(transaction.nonce.toNumber(), accountNonce);
      });

      it("allows a transaction with nonce equal to the account's transaction count", async () => {
        const txPool = new TransactionPool(options.miner, blockchain, origins);
        const transaction = TransactionFactory.fromRpc(
          { ...rpcTx, nonce: Quantity.toString(accountNonce) },
          common
        );
        assert.deepStrictEqual(transaction.nonce.toNumber(), accountNonce);

        await addTxToPoolAndVerify(txPool, transaction, secretKey, "pending");
      });

      it("allows a transaction with nonce greater than the account's transaction count", async () => {
        const futureNonce = accountNonce + 1;
        const txPool = new TransactionPool(options.miner, blockchain, origins);
        const transaction = TransactionFactory.fromRpc(
          { ...rpcTx, nonce: Quantity.toString(futureNonce) },
          common
        );
        assert.deepStrictEqual(transaction.nonce.toNumber(), futureNonce);

        await addTxToPoolAndVerify(txPool, transaction, secretKey, "queued");
      });

      it("rejects a transaction with nonce less than the account's transaction count", async () => {
        const nonce = "0x0";
        const txPool = new TransactionPool(options.miner, blockchain, origins);
        const transaction = TransactionFactory.fromRpc(
          { ...rpcTx, nonce },
          common
        );
        assert.deepStrictEqual(transaction.nonce.toString(), nonce);

        await assert.rejects(
          txPool.prepareTransaction(transaction, secretKey),
          {
            code: -32000,
            message:
              "the tx doesn't have the correct nonce. account has nonce of: 1 tx has nonce of: 0"
          }
        );
      });
    });

    describe("with inProgress transactions from the account and no pending transactions from the account", async () => {
      it("generates a nonce equal to the highest nonce of inProgress transactions from the account plus 1", async () => {
        const txPool = new TransactionPool(options.miner, blockchain, origins);
        const inProgressTxNonce = await addTxToInProgress(txPool);

        const transaction = TransactionFactory.fromRpc(rpcTx, common);
        assert(transaction.nonce.isNull());

        await txPool.prepareTransaction(transaction, secretKey);
        assert.strictEqual(
          transaction.nonce.toNumber(),
          inProgressTxNonce.toNumber() + 1
        );
      });

      it("allows a transaction with nonce equal to the highest nonce of inProgress transactions from the account plus 1", async () => {
        const txPool = new TransactionPool(options.miner, blockchain, origins);
        const inProgressTxNonce = await addTxToInProgress(txPool);

        const nonce = Quantity.toString(inProgressTxNonce.toNumber() + 1);
        const transaction = TransactionFactory.fromRpc(
          { ...rpcTx, nonce },
          common
        );

        await addTxToPoolAndVerify(txPool, transaction, secretKey, "pending");
        assert.strictEqual(
          transaction.nonce.toNumber(),
          inProgressTxNonce.toNumber() + 1
        );
      });

      it("allows a transaction with nonce greater than the highest nonce of inProgress transactions from the account plus 1", async () => {
        const txPool = new TransactionPool(options.miner, blockchain, origins);
        const inProgressTxNonce = await addTxToInProgress(txPool);

        const nonce = Quantity.toString(inProgressTxNonce.toNumber() + 2);
        const transaction = TransactionFactory.fromRpc(
          { ...rpcTx, nonce },
          common
        );

        await addTxToPoolAndVerify(txPool, transaction, secretKey, "queued");
        assert.strictEqual(
          transaction.nonce.toNumber(),
          inProgressTxNonce.toNumber() + 2
        );
      });

      it("rejects a transaction with nonce less than the highest nonce of inProgress transactions from the account plus 1", async () => {
        const txPool = new TransactionPool(options.miner, blockchain, origins);
        const inProgressTxNonce = await addTxToInProgress(txPool);

        const transaction = TransactionFactory.fromRpc(
          { ...rpcTx, nonce: inProgressTxNonce.toString() },
          common
        );

        await assert.rejects(
          txPool.prepareTransaction(transaction, secretKey),
          {
            code: -32000,
            message:
              "the tx doesn't have the correct nonce. account has nonce of: 1 tx has nonce of: 0"
          }
        );
      });
    });

    describe("with pending transactions from the account", async () => {
      it("generates a nonce equal to the highest nonce of pending transactions from the account plus 1", async () => {
        const txPool = new TransactionPool(options.miner, blockchain, origins);
        const inProgressTxNonce = await addTxToInProgress(txPool);

        const nonce = Quantity.toString(inProgressTxNonce.toNumber() + 1);
        const transaction = TransactionFactory.fromRpc(
          { ...rpcTx, nonce },
          common
        );

        await addTxToPoolAndVerify(txPool, transaction, secretKey, "pending");
        assert.strictEqual(
          transaction.nonce.toNumber(),
          inProgressTxNonce.toNumber() + 1
        );

        const transaction2 = TransactionFactory.fromRpc(rpcTx, common);
        assert(transaction2.nonce.isNull());

        await addTxToPoolAndVerify(txPool, transaction2, secretKey, "pending");
        assert.strictEqual(
          transaction2.nonce.toString(),
          Quantity.toString(transaction.nonce.toNumber() + 1)
        );
      });

      it("allows a transaction with nonce equal to the highest nonce of pending transactions from the account plus 1", async () => {
        const txPool = new TransactionPool(options.miner, blockchain, origins);
        const inProgressTxNonce = await addTxToInProgress(txPool);

        const nonce = Quantity.toString(inProgressTxNonce.toNumber() + 1);
        const transaction = TransactionFactory.fromRpc(
          { ...rpcTx, nonce },
          common
        );

        await addTxToPoolAndVerify(txPool, transaction, secretKey, "pending");
        assert.strictEqual(
          transaction.nonce.toNumber(),
          inProgressTxNonce.toNumber() + 1
        );

        const transaction2Nonce = Quantity.toString(
          transaction.nonce.toNumber() + 1
        );
        const transaction2 = TransactionFactory.fromRpc(
          { ...rpcTx, nonce: transaction2Nonce },
          common
        );

        await addTxToPoolAndVerify(txPool, transaction2, secretKey, "pending");
        assert.strictEqual(transaction2.nonce.toString(), transaction2Nonce);
      });

      it("allows a transaction with nonce greater than the highest nonce of pending transactions from the account plus 1", async () => {
        const txPool = new TransactionPool(options.miner, blockchain, origins);
        const inProgressTxNonce = await addTxToInProgress(txPool);

        const nonce = Quantity.toString(inProgressTxNonce.toNumber() + 1);
        const transaction = TransactionFactory.fromRpc(
          { ...rpcTx, nonce },
          common
        );

        await addTxToPoolAndVerify(txPool, transaction, secretKey, "pending");
        assert.strictEqual(
          transaction.nonce.toNumber(),
          inProgressTxNonce.toNumber() + 1
        );

        const transaction2Nonce = Quantity.toString(
          transaction.nonce.toNumber() + 2
        );
        const transaction2 = TransactionFactory.fromRpc(
          { ...rpcTx, nonce: transaction2Nonce },
          common
        );

        await addTxToPoolAndVerify(txPool, transaction2, secretKey, "queued");
        assert.strictEqual(transaction2.nonce.toString(), transaction2Nonce);
      });
    });
  });
});
