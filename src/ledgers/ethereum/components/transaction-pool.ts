import Emittery from "emittery";
import Blockchain from "../blockchain";
import Errors from "./errors";
import Heap from "../../../utils/heap";
import Transaction from "../../../types/transaction";
import { JsonRpcData, JsonRpcQuantity } from "../../../types/json-rpc";

export type TransactionPoolOptions = {
    gasPrice?: JsonRpcQuantity,
    gasLimit?: JsonRpcQuantity
};

function byNonce(values: Transaction[], a: number, b: number) {
    return values[b].nonce.toBigInt() < values[a].nonce.toBigInt();
}

const params = {
    /**
     *  Per transaction not creating a contract. NOTE: Not payable on data of calls between transactions.
     */
    TRANSACTION_GAS: 21000n,

    /**
     * Per byte of data attached to a transaction that is not equal to zero. NOTE: Not payable on data of calls between transactions.
     */
    TRANSACTION_DATA_NON_ZERO_GAS: 68n,
    /**
     * Per byte of data attached to a transaction that equals zero. NOTE: Not payable on data of calls between transactions.
     */
    TRANSACTION_DATA_ZERO_GAS: 4n
}

const MAX_UINT64 = (1n<<64n) - 1n;
/**
 * Compute the 'intrinsic gas' for a message with the given data.
 * @param data The transaction's data
 */
function calculateIntrinsicGas(data: Buffer): bigint {
	// Set the starting gas for the raw transaction
	let gas = params.TRANSACTION_GAS;
	
    // Bump the required gas by the amount of transactional data
    const dataLength = data.byteLength;
	if (dataLength > 0) {
		// Zero and non-zero bytes are priced differently
		let nonZeroBytes: bigint = 0n;
		for (const b of data) {
			if (b !== 0) {
				nonZeroBytes++
			}
		}
        // Make sure we don't exceed uint64 for all data combinations.
		if ((MAX_UINT64 - gas) / params.TRANSACTION_DATA_NON_ZERO_GAS < nonZeroBytes) {
			throw new Error(Errors.INTRINSIC_GAS_TOO_LOW);
		}
		gas += nonZeroBytes * params.TRANSACTION_DATA_NON_ZERO_GAS;

		let z = BigInt(dataLength) - nonZeroBytes;
		if ( (MAX_UINT64 - gas) / params.TRANSACTION_DATA_ZERO_GAS < z) {
			throw new Error(Errors.INTRINSIC_GAS_TOO_LOW);
		}
		gas += z * params.TRANSACTION_DATA_ZERO_GAS;
	}
	return gas;
}

export default class TransactionPool extends Emittery {
    private options: TransactionPoolOptions;

    /**
     * Minimum gas price to enforce for acceptance into the pool
     */
    public priceLimit: number = 1

    /**
     * Minimum price bump percentage to replace an already existing transaction (nonce)
     */
	public priceBump: number = 10

    /**
     * Number of executable transaction slots guaranteed per account
     */
    public accountSlots: number = 16
    
    /**
     * Maximum number of executable transaction slots for all accounts
     */
    public globalSlots: number = 4096

    /**
     * Maximum number of non-executable transaction slots permitted per account
     */
    public accountQueue: number = 64

    /**
     * Maximum number of non-executable transaction slots for all accounts
     */
	public globalQueue: number = 1024

    /**
     * Maximum amount of time non-executable transaction are queued, in milliseconds
     */
    public lifetime: number = 3  * 24 * 60 * 60 * 1000
    
    private blockchain: Blockchain;
    constructor(blockchain: Blockchain, options: TransactionPoolOptions) {
        super();
        this.blockchain = blockchain;
        this.options = options;
    }
    public length: number;
    private hashes = new Set<string>();
    private pending: Map<string, Heap<Transaction>> = new Map();
    private origins: Map<string, Heap<Transaction>> = new Map();
    
    public async insert(transaction: Transaction) {
        const hash = transaction.hash().toString();

        // if this transaction is a duplicate, discard it
        if (this.hashes.has(hash)) {
            throw new Error(`known transaction: ${hash}`);
        }

        let err: Error;
        err = this.validateTransaction(transaction);
        if (err != null) {
            throw err;
        }

        const from = JsonRpcData.from(transaction.from);

        const origin = from.toString();
        const orgins = this.origins;
        let queuedOriginTransactions = orgins.get(origin);

        // TODO: If the transaction pool is full, discard underpriced transactions
        if (this.length >= this.globalSlots + this.globalQueue) {
            // TODO: If the new transaction is underpriced, don't accept it
            // TODO: if the new transaction is better than our worse one, make
            //   room for it by discarding a cheaper transaction
        }
        // TODO: if the transaction is replacing an already pending transaction,
        //  do it now...
        // a transaction can replace a *pending* transaction if the new tx's
        //  nonce matches the pending nonce 
        // AND the new tx's gasPrice is `this.priceBump` greater than the
        //  pending tx's.


        
        const transactor = await this.blockchain.accounts.get(from);
        err = await this.validateTransactor(transaction, transactor);
        if (err != null) {
            throw err;
        }

        // If a transaction is at the correct `nonce` it is executable.
        const transactionNonce = transaction.nonce.toBigInt();
        if (transactor.nonce.toBigInt() + 1n === transactionNonce) {
            // we need to pull out the origin's transactions that are now executable
            // from the `pendingOriginTransactions`, if it is available
            const pending = this.pending;
            let pendingOriginTransactions = pending.get(origin);
            if (!pendingOriginTransactions) {
                pendingOriginTransactions = new Heap<Transaction>(byNonce);
                pendingOriginTransactions.array = [transaction];
                pendingOriginTransactions.length = 1;
                pending.set(origin, pendingOriginTransactions);
            } else {
                pendingOriginTransactions.push(transaction);
            }
            if (queuedOriginTransactions) {
                let nextTransaction: any;
                let nextNonce: bigint = transactionNonce;
                while (nextTransaction = queuedOriginTransactions.peek()) {
                    nextNonce += 1n;
                    if (nextTransaction.nonce.toBigInt() !== nextNonce) {
                        break;
                    } else {
                        pendingOriginTransactions.push(nextTransaction);
                        // remove this transaction from the queue
                        queuedOriginTransactions.shift();
                    }
                }
            }
            // notify miner that we have pending transactions ready for it
            this.emit("drain", pending);
            return;
        }

        // TODO: if we got here we have a transaction that *isn't* executable
        // insert the transaction in its origin's (i.e., the `from` address's)
        //   Heap, which sorts by nonce
        
        if (!queuedOriginTransactions) {
            queuedOriginTransactions = new Heap<Transaction>(byNonce);
            queuedOriginTransactions.array = [transaction];
            queuedOriginTransactions.length = 1;
            orgins.set(origin, queuedOriginTransactions);
        } else {
            queuedOriginTransactions.push(transaction);
        }
    }

    public validateTransaction(transaction: Transaction): Error {
        // Check the transaction doesn't exceed the current block limit gas.
        if (this.options.gasLimit < JsonRpcQuantity.from(transaction.gasLimit)) {
            return new Error("Transaction gasLimit is too low");
        }

        // Transactions can't be negative. This may never happen using RLP
        // decoded transactions but may occur if you create a transaction using
        // the RPC for example.
        if (transaction.value < 0) {
            return new Error("Transaction value cannot be negative");
        }

        // Should supply enough intrinsic gas
        const gas = calculateIntrinsicGas(transaction.input);
        if (transaction.gasPrice < gas) {
            return new Error("intrisic gas too low");
        }

        return null;
    }

    public async validateTransactor(transaction: Transaction, transactor: any): Promise<Error> {
        // Transactor should have enough funds to cover the costs
        if (transactor.balance.toBigInt() < transaction.cost()) {
            return new Error("Account does not have enough funds to complete transaction");
        }

        // check that the nonce isn't too low
        if (transactor.nonce > transaction.nonce) {
            return new Error("Transaction nonce is too low");
        }
        return null;
    }
}