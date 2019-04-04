import { JsonRpcData, JsonRpcQuantity } from "./json-rpc";
import Address from "./address";

type TransactionDataObject = {
    blockHash: string,
    blockNumber: string,
    from: string,
    gas: string,
    gasPrice:  string,
    hash: string,
    input: string,
    nonce:  string,
    to: string,
    transactionIndex: string,
    value: string,
    v: string,
    r: string,
    s: string
}

type TransactionData = {
    blockHash: JsonRpcData,
    blockNumber: JsonRpcData,
    from: Address,
    gas: JsonRpcQuantity,
    gasPrice:  JsonRpcQuantity,
    hash: JsonRpcData,
    input: JsonRpcData,
    nonce:  JsonRpcQuantity,
    to: Address,
    transactionIndex: JsonRpcQuantity,
    value: JsonRpcQuantity,
    v: JsonRpcQuantity,
    r: JsonRpcData,
    s: JsonRpcData
}

export default class Transaction implements TransactionData{
    blockHash: JsonRpcData<string | Buffer>;
    blockNumber: JsonRpcData<string | Buffer>;
    from: JsonRpcData<string | Buffer>;
    gas: JsonRpcQuantity<string | bigint | Buffer>;
    gasPrice: JsonRpcQuantity<string | bigint | Buffer>;
    hash: JsonRpcData<string | Buffer>;
    input: JsonRpcData<string | Buffer>;
    nonce: JsonRpcQuantity<string | bigint | Buffer>;
    to: JsonRpcData<string | Buffer>;
    transactionIndex: JsonRpcQuantity<string | bigint | Buffer>;
    value: JsonRpcQuantity<string | bigint | Buffer>;
    v: JsonRpcQuantity<string | bigint | Buffer>;
    r: JsonRpcData<string | Buffer>;
    s: JsonRpcData<string | Buffer>;
    constructor() {
        const obj =  {
            blockHash: JsonRpcData.from("0x123456", 32), // 32 Bytes - hash of the block where this transaction was in. null when its pending.
            blockNumber:  JsonRpcQuantity.from(123n),// QUANTITY - block number where this transaction was in. null when its pending.
            from: JsonRpcData.from("0x123456", 32), // 20 Bytes - address of the sender.
            gas: JsonRpcQuantity.from(123n),// QUANTITY - gas provided by the sender.
            gasPrice:  JsonRpcQuantity.from(123n),// QUANTITY - gas price provided by the sender in Wei.
            hash: JsonRpcData.from("0x123456", 32),// DATA, 32 Bytes - hash of the transaction.
            input: JsonRpcData.from("0x123"),// DATA - the data send along with the transaction.
            nonce:  JsonRpcQuantity.from(123456n),// QUANTITY - the number of transactions made by the sender prior to this one.
            to: JsonRpcData.from("0x123456", 20),// DATA, 20 Bytes - address of the receiver. null when its a contract creation transaction.
            transactionIndex: JsonRpcQuantity.from(99n),// QUANTITY - integer of the transaction's index position in the block. null when its pending.
            value: JsonRpcQuantity.from(123n),// QUANTITY - value transferred in Wei.
            v: JsonRpcQuantity.from(Buffer.from([27])), // QUANTITY - ECDSA recovery id
            r: JsonRpcData.from(Buffer.from([12,34,46]), 32),// DATA, 32 Bytes - ECDSA signature r
            s: JsonRpcData.from("0x123456", 32),// DATA, 32 Bytes - ECDSA signature s
        } as any;
        Object.keys(obj).forEach((key) => {
            (this as any)[key] = obj[key] as any;
        });
    }
    // https://github.com/fastify/fast-json-stringify
    // https://github.com/YousefED/typescript-json-schema
    toObject(): TransactionDataObject {
        const a = JSON.stringify({
            gasPrice: this.gasPrice
        });
        console.log(a);
        return {
            gasPrice: this.gasPrice.toString()
        } as TransactionDataObject;
    }
}