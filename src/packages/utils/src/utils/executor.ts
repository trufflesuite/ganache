import { hasOwn } from "./has-own";
import { KnownKeys, Api, OverloadedParameters } from "../types";
import { RequestCoordinator } from "./request-coordinator";

export class Executor {
  #requestCoordinator: RequestCoordinator;

  /**
   * The Executor handles execution of methods on the given API
   */
  constructor(requestCoordinator: RequestCoordinator) {
    this.#requestCoordinator = requestCoordinator;
  }

  /**
   * Executes the method with the given methodName on the API
   * @param methodName The name of the JSON-RPC method to execute.
   * @param params The params to pass to the JSON-RPC method.
   */
  public execute<T extends Api, M extends KnownKeys<T>>(
    api: T,
    methodName: M,
    params: OverloadedParameters<T[M]>
  ) {
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
      if (
        (hasOwn(api.__proto__, methodName) && methodName !== "constructor") ||
        hasOwn(api, methodName)
      ) {
        // cast methodName from `KnownKeys<T> & string` back to KnownKeys<T> so our return type isn't weird.
        const fn = api[methodName as M];
        // just double check, in case a API breaks the rules and adds non-fns
        // to their API interface.
        if (typeof fn === "function") {
          // queue up this method for actual execution:
          return this.#requestCoordinator.queue(fn, api, params);
        }
      }
    }

    throw new Error(`The method ${methodName} does not exist/is not available`);
  }
}
