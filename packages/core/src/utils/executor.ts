import Api from "../interfaces/api";

const hasOwn = ({}).hasOwnProperty.call.bind(({}).hasOwnProperty);

export default class Executor {
  /**
   * The Executor handles execution of methods on the given Ledger
   */
  constructor() {
  }

  /**
   * Executes the method with the given methodName on the Ledger
   * @param methodName The name of the JSON-RPC method to execute.
   * @param params The params to pass to the JSON-RPC method.
   */
  public async execute <T extends Api, M = keyof T>(
    api: T,
    methodName: M,
    params: Parameters<T[keyof T]>
  ): Promise<ReturnType<T[keyof T]>> {
    // The methodName is user-entered data and can be all sorts of weird hackery
    // Make sure we only accept what we expect to avoid headache and heartache
    if (typeof methodName === "string") {
      // Only allow executing our *own* methods. We allow:
      //  * functions added to the Instance by the class, e.g.,
      //      class SomeClass {
      //        method = () => {} // api.hasOwnProperty("method") === true
      //      }
      //  * Or by the class' prototype:
      //      class SomeClass {
      //        method(){} // api.__proto__.hasOwnProperty("method") === true
      //      }
      if ((hasOwn(api.__proto__, methodName) && methodName !== "constructor") || hasOwn(api, methodName)) {
        const fn = api[methodName];
        // just double check, in case a Ledger breaks the rules and adds non-fns
        // to their Ledger interface.
        if (typeof fn === "function") {
          // use Reflect.apply because fn.apply can be shadowed/overwritten.
          return Reflect.apply(fn, api, params || []);
        }
      }
    }

    throw new Error(`Invalid or unsupported method: ${methodName}`);
  };
}
