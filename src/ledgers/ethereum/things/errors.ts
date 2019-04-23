export default {
    /**
     * Returned if the transaction contains an invalid signature.
     */
    INVALID_SENDER: "invalid sender",
    
    /**
     * Returned if the nonce of a transaction is lower than the one present in the local chain.
     */
    NONCE_TOO_LOW: "nonce too low",

    /**
     * Returned if a transaction's gas price is below the minimum configured for the transaction pool.
     */
    UNDERPRICED: "transaction underpriced",

    /**
     * Returned if the transaction is specified to use less gas than required to start the invocation.
    */
    INTRINSIC_GAS_TOO_LOW: "intrinsic gas too low",

    /**
     * Returned if a transaction's requested gas limit exceeds the maximum allowance of the current block.
     */
    GAS_LIMIT: "exceeds block gas limit"
};