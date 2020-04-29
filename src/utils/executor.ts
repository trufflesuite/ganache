import Api from "../interfaces/api";
import Emittery from "emittery";

export default class Executor extends Emittery {
  /**
   * The Executor handles execution of methods on the given Ledger
   */
  constructor() {
    super();
  }

  /**
   * Executes the method with the given methodName on the Ledger
   * @param methodName The name of the JSON-RPC method to execute.
   * @param params The params to pass to the JSON-RPC method.
   */
  public execute = async <T extends Api, M = keyof T>(
    api: T,
    methodName: M,
    params: Parameters<T[keyof T]>
  ): Promise<ReturnType<T[keyof T]>> => {
    // The methodName is user-entered data and can be all sorts of weird hackery
    // Make sure we only accept what we expect to avoid headache and heartache
    if (typeof methodName === "string") {
      // Only allow executing our *own* methods:
      if (methodName !== "constructor" && api.__proto__.hasOwnProperty(methodName)) {
        const fn = api[methodName];
        // just double check, in case a Ledger breaks the rules and adds non-fns
        // to their Ledger interface.
        if (typeof fn === "function") {
          return fn.apply(api, params);
        }
      }
    }

    throw new Error(`Invalid or unsupported method: ${methodName}`);
  };
}
