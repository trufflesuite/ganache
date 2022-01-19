import assert from "assert";
import { Executor, RequestCoordinator } from "@ganache/utils";
import { Connector } from "../";

describe("connector", () => {
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
  let connector: Connector<any>;
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
  beforeEach(async () => {
    const requestCoordinator = new RequestCoordinator(0);
    const executor = new Executor(requestCoordinator);
    connector = new Connector({}, executor);
    await connector.connect();
  });
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
