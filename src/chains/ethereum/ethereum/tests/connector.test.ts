import Transaction from "@ethereumjs/tx/dist/legacyTransaction";
import assert from "assert";
import { Data, Executor, RequestCoordinator } from "@ganache/utils";
import { Connector } from "../";

describe("connector", () => {
  describe("formatting", () => {
    let connector: Connector<any>;
    beforeEach(async () => {
      const requestCoordinator = new RequestCoordinator(0);
      const executor = new Executor(requestCoordinator);
      connector = new Connector({}, executor);
      await connector.connect();
      requestCoordinator.resume();
    });
    afterEach(async () => {
      await connector?.close();
    });
    const primitives = {
      string: "string",
      empty: "empty",
      one: 1,
      zero: 1,
      true: true,
      false: false,
      null: null,
      undefined: undefined
    };
    const json = {
      ...primitives,
      // `structLogs` triggers an optimization in the connector
      structLogs: [{ ...primitives }, ...Object.values(primitives)],
      emptyArray: [],
      // notDefined and alsoNotDefined should be removed when JSON stringified/bufferified
      trickyObject: {
        notDefined: undefined,
        defined: true,
        alsoNotDefined: undefined
      },
      allUndefinedArray: [undefined, undefined, undefined],
      allUndefinedObject: { uno: undefined, dos: undefined, tres: undefined },
      trickyArray: [...Object.values(primitives)],
      object: {
        ...primitives,
        emptyObject: {},
        nested: { ...primitives },
        array: [{ ...primitives }, ...Object.values(primitives)]
      },
      emptyObject: {}
    };

    // an arbitrary payload
    // `debug_traceTransaction` triggers an optimization in the connector
    const payload = {
      jsonrpc: "2.0",
      method: "debug_traceTransaction",
      id: 1,
      params: [] // params don't matter
    };
    const expected = JSON.parse(
      JSON.stringify({
        jsonrpc: payload.jsonrpc,
        id: payload.id,
        result: json
      })
    );

    it("formats results as a string as expected", async () => {
      const strResult = connector.format(json, payload) as string;
      assert.strictEqual(typeof strResult, "string");
      const result = JSON.parse(strResult);
      assert.deepStrictEqual(result, expected);
    });
    it("formats results as a Buffer as expected", async () => {
      function isGeneratorIterator(arg) {
        return arg.constructor === function* () {}.prototype.constructor;
      }
      // trigger the buffering optimization without having to actually parse
      // the amount of data it usually takes
      connector.BUFFERIFY_THRESHOLD = 1;

      const bufResult = connector.format(json, payload);
      assert(isGeneratorIterator(bufResult));
      let str = "";
      for (const datum of bufResult as any) {
        str += datum.toString("utf-8");
      }
      const result = JSON.parse(str);
      assert.deepStrictEqual(result, expected);
    }).timeout(10000);
  });

  describe("legacyInstamine", () => {
    let connector: Connector<any>;
    beforeEach(async () => {
      const requestCoordinator = new RequestCoordinator(0);
      const executor = new Executor(requestCoordinator);
      connector = new Connector(
        {
          logging: { logger: { log: () => {} } },
          wallet: { deterministic: true },
          chain: { chainId: 1 }
        },
        executor
      );
      await connector.connect();
      requestCoordinator.resume();
    });
    afterEach(async () => {
      await connector?.close();
    });

    const connectionTypes = [
      { name: "uWS.HttpRequest", check: assert.notStrictEqual as any },
      { name: "uWS.WebsocketRequest", check: assert.strictEqual as any }
    ] as const;
    let tx = {
      nonce: "0x0",
      gasPrice: "0xffffffff",
      gasLimit: "0x5208",
      value: "0x0",
      from: null,
      to: null
    };
    const rawTxParams = [];
    const methods = [
      { method: "eth_sendTransaction", params: [tx] },
      { method: "personal_sendTransaction", params: [tx, ""] },
      { method: "eth_sendRawTransaction", params: rawTxParams }
    ];

    beforeEach(() => {
      const accounts = connector.provider.getInitialAccounts();
      const [from, to] = Object.keys(accounts);
      const key = Data.from(accounts[from].secretKey).toBuffer();

      tx.from = from;
      tx.to = to;

      const rawTx = Data.from(Transaction.fromTxData(tx).sign(key).serialize());
      rawTxParams[0] = rawTx.toString();
    });

    // for each `connectionType` (Http or Websocket) check that the given
    // request `method` passes the `check`: should be `notStrictEqual` to `null`
    // for HTTP connections and `strictEqual` to `null` for Websocket
    // connections.
    for (let i = 0; i < connectionTypes.length; i++) {
      const { name, check } = connectionTypes[i];
      for (let j = 0; j < methods.length; j++) {
        const { method, params } = methods[j];

        it(`forces legacyInstamine mode for ${method} only over HTTP (${name})`, async () => {
          const message = { method, params: [...params] };
          const { provider } = connector;
          const connection = { constructor: { name } } as any;
          const { value } = await connector.handle(message, connection);
          const transactionHash = (await value).toString();
          const receipt = await provider.send("eth_getTransactionReceipt", [
            transactionHash
          ]);
          check(receipt, null);
        });
      }
    }
  });
});
