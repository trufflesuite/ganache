import assert from "assert";
import Ganache from "../";

describe("connector", () => {
  it("works without passing options", async () => {
    assert.doesNotThrow(async () => {
      const _provider = Ganache.provider();
    });
  });

  it("it logs when `options.verbose` is `true`", async () => {
    const logger = { log: (_msg: string) => {} };
    const p = Ganache.provider({
      logging: { logger, verbose: true }
    });

    logger.log = msg => {
      assert.strictEqual(
        msg,
        "   >  net_version: undefined",
        "doesn't work when no params"
      );
    };
    await p.send("net_version");

    return new Promise(async resolve => {
      logger.log = msg => {
        const expected =
          "   >  web3_sha3: [\n" + '   >   "Tim is a swell guy."\n' + "   > ]";
        assert.strictEqual(msg, expected, "doesn't work with params");
        resolve();
      };
      await p.send("web3_sha3", ["Tim is a swell guy."]);
    });
  });

  it("it processes requests asynchronously when `asyncRequestProcessing` is default (true)", async () => {
    const p = Ganache.provider();
    const accounts = await p.send("eth_accounts");
    // `eth_accounts` should always be faster than eth_getBalance; eth_accounts
    // should return before eth_getBalance because of the
    // `asyncRequestProcessing` flag.
    const calA = p.send("eth_getBalance", [accounts[0]]);
    const callB = p.send("eth_accounts");
    const result = await Promise.race([calA, callB]);
    assert(Array.isArray(result));
    assert.strictEqual(result.length, 10);
  });

  it("it processes requests synchronously when `asyncRequestProcessing` is `false`", async () => {
    const p = Ganache.provider({
      chain: { asyncRequestProcessing: false }
    });
    const accounts = await p.send("eth_accounts");
    // eth_getBalance should return first even though eth_accounts is faster;
    // eth_getBalance should return before eth_accounts because of the
    // `asyncRequestProcessing` flag.
    const calA = p.send("eth_getBalance", [accounts[0]]);
    const callB = p.send("eth_accounts");
    const result = await Promise.race([calA, callB]);
    assert.strictEqual(result, "0x3635c9adc5dea00000");
  });

  // duck punch a property that shouldn't appear on the API. we test this
  // to make sure that 3rd party API implementations can't shoot themselves
  // in the foot on accident
  it.skip("TODO: allow 'injecting' our own engine or API into a provider!", async () => {
    const p = Ganache.provider();
    // this won't work because ganache uses _real_ private properties that can't
    // be duck punched. This test is supposed to ensure that _real_ non-function
    // own properties (and __proto__ properties) can't be executed.
    (p as any)._engine._api.__proto__.illegalProperty = true;
    await assert.rejects(p.send("illegalProperty" as any, []), {
      message: "`The method illegalProperty does not exist/is not available`"
    });
  });

  it("rejects invalid rpc methods", async () => {
    const p = Ganache.provider({
      logger: { log: () => {} }
    });

    const illegalMethodNames = [
      "toString",
      "toValue",
      "__proto__",
      "prototype",
      "notAFunction",
      "",
      " ",
      "constructor"
    ] as const;
    await Promise.all(
      illegalMethodNames.map(methodName =>
        assert.rejects(
          p.send(methodName as any),
          {
            message: `The method ${methodName} does not exist/is not available`
          },
          `Missed expected rejection for method "${methodName}"`
        )
      )
    );

    // make sure we reject non-strings over the classical send interface
    const circular: any = {};
    circular.circular = circular;
    const illegalMethodTypes = [
      123,
      // just cast as string to make TS let me test weird stuff...
      (Buffer.from([1]) as unknown) as string,
      null,
      void 0,
      {},
      [],
      { foo: "bar" },
      [1, 2],
      new Date(),
      Infinity,
      NaN,
      circular
    ] as const;
    await Promise.all(
      illegalMethodTypes.map(method => {
        return assert.rejects(
          new Promise((resolve, reject) => {
            p.send(
              {
                id: "1",
                jsonrpc: "2.0",
                method
              },
              (err, result): void => {
                if (err) {
                  reject(err);
                } else {
                  resolve(result);
                }
              }
            );
          }),
          {
            message: `The method ${method} does not exist/is not available`
          },
          `Missing expected rejections for "${method}"`
        );
      })
    );

    // make sure we reject non-strings over the legacy send interface
    illegalMethodTypes.map(methodType => {
      assert.throws(() => p.send(methodType), {
        message:
          "No callback provided to provider's send function. As of " +
          "web3 1.0, provider.send is no longer synchronous and must be " +
          "passed a callback as its final argument."
      });
    });
  });
});
