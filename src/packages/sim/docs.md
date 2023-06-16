# Simulate Transactions Documentation

The RPC method is named `evm_simulateTransactions`.

Send requests just as you would any Ethereum JSON-RPC 2.0 request.

RPC requests temporarily return a top level `durationMs` property (alongside id, jsonrpc, and result/error) which represents the amount of time the request took to process in milliseconds. You can use this value to better understand how RTT to the RPC host will affect users in different areas of the world.

## TypeScript Interface

Also see [types.ts](./types.ts).

```typescript
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
   * Currently limited to opcodes for CALL, CALLCODE, DELEGATECALL, STATICCALL, CREATE, CREATE2, JUMP, JUMPI
   *
   */
  opcode: Data;
  /**
   * The name of the opcode (CALL, CALLCODE, DELEGATECALL, STATICCALL, CREATE, CREATE2, JUMP, JUMPI)
   */
  name: string;
  pc: number;
  /**
   * Decoded function signature (via 4byte directory)
   */
  signature?: string;
} & (CALLTraceEntry | JUMPTraceEntry | {}); // {} because CREATE and CREATE2 materialize as just the base TraceEntry

export type CALLTraceEntry = {
  from?: Address;
  to?: Address;
  value?: Quantity;
  data?: Data;
  args?: { type: string; value: Quantity | Data }[];
};

export type JUMPTraceEntry = {
  destination: Quantity;
  condition?: Quantity;
};
```

## Example Usage

```typescript
/**
 * Sends a JSON-RPC request to the `evm_simulateTransactions` endpoint.
 *
 * @param {SimulationRequestParams} params - The request parameters.
 * @param {string} endpoint - The endpoint URL.
 * @returns {Promise<SimulationResponse>} - The response from the endpoint.
 */
async function sendSimulationRequest(
  params: SimulationRequestParams,
  endpoint: string
): Promise<SimulationResponse> {
  const data = {
    jsonrpc: "2.0",
    method: "evm_simulateTransactions",
    params: params,
    id: 1
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const json = await response.json();
    return json.result as SimulationResponse;
  } catch (error) {
    throw error;
  }
}

/**
 * Logs information about gas usage and transaction success.
 *
 * @param {SimulationResponse} response - The simulation response.
 */
function logGasUsageAndSuccess(response: SimulationResponse) {
  response.forEach((result: SimulationResult, index: number) => {
    console.log(`Transaction ${index + 1} Gas Usage:`);
    console.log("Total:", BigInt(result.gas.total).toLocaleString());
    console.log("Actual:", BigInt(result.gas.actual).toLocaleString());
    console.log("Refund:", BigInt(result.gas.refund).toLocaleString());
    console.log("Intrinsic:", BigInt(result.gas.intrinsic).toLocaleString());
    console.log("Execution:", BigInt(result.gas.execution).toLocaleString());
    if (result.gas.estimate) {
      console.log("Estimate:", BigInt(result.gas.estimate).toLocaleString());
    }

    console.log(
      `Transaction ${index + 1} Status:`,
      !result.error ? "Successful" : "Failed"
    );
    if (result.error) {
      console.log("Failure Reason:", result.error.message);
    }
    console.log("---");
  });

  console.log("Total Gas Usage:");
  const totalGas = response.reduce((acc: bigint, result: SimulationResult) => {
    const gasUsed = BigInt(result.gas.actual);
    return acc + gasUsed;
  }, 0n);
  console.log(totalGas.toLocaleString());
  console.log("---");
}

// Example usage:
const endpoint = "https://example.com/jsonrpc"; // Replace with your actual Ganache simulator endpoint URL
const simulationParams = [
  {
    transactions: [
      {
        from: "0xd7c2b5c77f0ba843d863e1ed488d40472de53ec9",
        to: "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0",
        gas: "0x8000000000000000",
        data: "0x095ea7b300000000000000000000000082e0b8cdd80af5930c4452c684e71c861148ec8a000000000000000000000000000000000000000000000002817b497c9ca44000"
      },
      {
        from: "0xd7c2b5c77f0ba843d863e1ed488d40472de53ec9",
        to: "0x82e0b8cdd80af5930c4452c684e71c861148ec8a",
        gas: "0x8000000000000000",
        data: "0x3ce33bff00000000000000000000000000000000000000000000000000000000000000800000000000000000000000007d1afa7b718fb893db30a3abc0cfc608aacfebb0000000000000000000000000000000000000000000000002817b497c9ca4400000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000b6c6966694164617074657200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000005d3675d698a3dd53e3457951e1debef717a29a720000000000000000000000005d3675d698a3dd53e3457951e1debef717a29a7200000000000000000000000000000000000000000000000000000000000000890000000000000000000000007d1afa7b718fb893db30a3abc0cfc608aacfebb000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000027bde5e48a43b22000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000059ceb33f8691e00000000000000000000000000e6b738da243e8fa2a0ed5915645789add5de5152000000000000000000000000000000000000000000000000000000000000009033619a2d20e0f32c0ab1598bd7c2b5c77f0ba843d863e1ed488d40472de53ec9000000897d1afa7b718fb893db30a3abc0cfc608aacfebb000000000000000027bde5e48a43b220000000000000000025b84aa3e4b74b24600000000000000000000000000000000000000000000000000000000000000000000000022b1cbb8d98a01a3b71d034bb899775a76eb1cc200000000000000000000000000000000"
      }
    ],
    estimateGas: true,
    trace: true
  },
  "0x10ab97e" // block number to simulate on top of
] as SimulationRequestParams;

sendSimulationRequest(simulationParams, endpoint)
  .then(response => {
    console.log("Simulation Response:", response);
    logGasUsageAndSuccess(response);
  })
  .catch(error => {
    console.error("Error:", error);
  });
```
