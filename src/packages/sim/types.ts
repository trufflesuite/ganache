/**
 * 0x prefixed hex pairs, e.g., `0x0123`
 */
export type DATA = string;

/**
 * 0x prefixed 20 byte ethereum address
 */
export type ADDRESS = DATA;

/**
 * 0x-prefixed compact hex string, e.g., `0x123`
 */
export type QUANTITY = string;

/**
 * Request params for sending an `evm_simulateTransactions` RPC request.
 */
export type SimulationRequestParams = [
  {
    /**
     * The transactions you want to simulate, in order.
     */
    transactions: Transaction[];
    /**
     * `true` to compute and return a gas estimate, otherwise `false`.
     * The gas estimate returned here uses the `gas` limit set in each transaction.
     * This means that if the transaction runs out of gas at the user-specified
     * limit the gas estimate will reflect the amount of gas required to get
     * to the point at which it ran out of gas.
     */
    estimateGas?: boolean;
    /**
     * `true` to return a transaction CALL* trace, otherwise `false`.
     */
    trace?: boolean;

    overrides: {
      [address: ADDRESS]: StateOverride;
    };
  },
  /**
   * The block number the transaction should be simulated on top of. This is how
   * `eth_call` works, but differs from how Tenderly works.
   */
  QUANTITY | "latest"
];

/**
 * Identical to the `eth_call` overrides argument
 */
export type StateOverride = Partial<
  (
    | { state: { [slot: DATA]: DATA } }
    | { stateDiff: { [slot: DATA]: DATA } }
  ) & {
    code: DATA;
    nonce: QUANTITY;
    balance: QUANTITY;
  }
>;

/**
 * The transaction to simulate.
 */
export type Transaction = {
  from: ADDRESS;
  to?: ADDRESS;
  /**
   * This value is also used as an upper limit for gas estimations.
   */
  gas?: QUANTITY;
  gasPrice?: QUANTITY;
  value?: QUANTITY;
  data?: DATA;
};

/**
 * The response to an `evm_simulateTransactions` RPC request.
 */
export type SimulationResponse = SimulationResult[];

export type SimulationResult = {
  error?: {
    code: number;
    message: string;
  };
  returnValue?: DATA;
  gas: GasBreakdown;
  logs: Log[];
  storageChanges: StorageChange[];
  stateChanges: StateChange[];
  receipts?: DATA[];
  /**
   * The trace of the transaction. This is only returned if `trace` is set to true.
   */
  trace?: TraceEntry[];
};

export type Log = [address: ADDRESS, topics: DATA[], data: DATA];

export type GasBreakdown = {
  /**
   * The total amount of gas used by the transaction.
   */
  total: QUANTITY;

  /**
   * Total gas used minus the refund. This is what etherscan reports as `Gas Usage`.
   */
  actual: QUANTITY;

  /**
   * The amount of gas refunded to the sender.
   */
  refund: QUANTITY;

  /**
   * The amount of gas the EVM requires before it would attempt to run the
   * transaction.
   */
  intrinsic: QUANTITY;

  /**
   * The amount of gas used by the transaction's actual execution.
   */
  execution: QUANTITY;

  /**
   * The minimum amount of gas required to run the transaction. This is only returned if `estimateGas` is set to true.
   */
  estimate?: QUANTITY;
};

type StorageChange = {
  key: DATA;
  address: ADDRESS;
  before: DATA;
  after: DATA;
};

type StateChange = {
  address: ADDRESS;
  from: {
    nonce: QUANTITY;
    balance: QUANTITY;
    storageRoot: DATA;
    codeHash: DATA;
  };
  to: {
    nonce: QUANTITY;
    balance: QUANTITY;
    storageRoot: DATA;
    codeHash: DATA;
  };
};

export type TraceEntry = {
  /**
   * The opcode of the trace entry.
   * Currently limited to opcodes for CALL, CALLCODE, DELEGATECALL, STATICCALL
   *
   */
  opcode: DATA;
  /**
   * The name of the opcode (CALL, CALLCODE, DELEGATECALL, STATICCALL)
   */
  name: string;
  from: ADDRESS;
  to: ADDRESS;
  value: QUANTITY;
  pc: number;
  data?: string;
  /**
   * Decoded function signature (via 4byte directory)
   */
  signature?: string;
  args?: { type: string; value: DATA | QUANTITY }[];
};
