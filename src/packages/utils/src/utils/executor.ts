import { KnownKeys, Api } from "../types";
import {RequestCoordinator} from "./request-coordinator";
import { Logger } from "./logger";

const hasOwn = ({}).hasOwnProperty.call.bind(({}).hasOwnProperty);

export class Executor {
  #requestCoordinator: RequestCoordinator
  #logger:Logger

  /**
   * The Executor handles execution of methods on the given Ledger
   */
  constructor(requestCoordinator: RequestCoordinator, logger:Logger = null) {
    this.#requestCoordinator = requestCoordinator;
    this.#logger = logger;
  }

  /**
   * Executes the method with the given methodName on the Ledger
   * @param methodName The name of the JSON-RPC method to execute.
   * @param params The params to pass to the JSON-RPC method.
   */
  public execute <T extends Api>(
    api: T,
    methodName: KnownKeys<T>,
    params: Parameters<T[KnownKeys<T>]>
  ): Promise<{value: ReturnType<T[KnownKeys<T>]>}> {

    if (this.#logger) {
      this.#logger.log("request: ");
      this.#logger.log("  method: " + methodName);
      this.#logger.log("  params: " + JSON.stringify(params));
    }

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
        // cast methodName from `KnownKeys<T> & string` back to KnownKeys<T> so our return type isn't weird.
        const fn = api[methodName];
        // just double check, in case a Ledger breaks the rules and adds non-fns
        // to their Ledger interface.
        if (typeof fn === "function") {
          // queue up this method for actual execution:
          const resultPromise = this.#requestCoordinator.queue(fn, api, params);

          // wait for the output and log it if there's a logger passed
          if (this.#logger) {
            resultPromise.then((resultValueHolder) => {
              resultValueHolder.value.then(result => {
                let lines = JSON.stringify(result, null, 2).split("\n");
                let firstLine = lines.shift();

                this.#logger.log("  result: " + firstLine);
                lines.forEach((line) => console.log("          " + line))
                this.#logger.log("")
              }).catch(()=>{});
            }).catch(()=>{});
          }

          return resultPromise;
        }
      }
    }

    throw new Error(`The method ${methodName} does not exist/is not available`);
  };
}
