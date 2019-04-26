export default {
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
  };