import { WebhookEvent } from "@octokit/webhooks";
import { Context } from "probot";

type WebhookContext = WebhookEvent<any> &
  Omit<Context<any>, keyof WebhookEvent<any>>;

export default class QueryManager {
  repo: any;
  owner: any;
  context: WebhookContext;
  constructor(repo: any, owner: any, context: WebhookContext) {
    this.repo = repo;
    this.owner = owner;
    this.context = context;
  }
  /**
   * Implements exponential back-off on a `query`, reattempting each time the
   * `query` result's value at the specified `props` is equal to one of the
   * `retryValues`. Continues to retry `retries` times.
   * @param query The query to execute.
   * @param props The props of the result to check for a retry.
   * @param retryValues The values that, if found in the result, indicate a retry
   * should be attempted.
   * @param retries The number of times to retry.
   * @returns
   */
  static queryWithRetries = async <Type>(
    query: () => Promise<Type>,
    props: string[],
    retryValues: any[],
    retries: number = 3
  ): Promise<Type | undefined> => {
    const maxBackoff = 32 * 1000; // 32 seconds
    let i = 0;
    let delay = 0;
    while (i < retries) {
      const { result, value }: { result: Type; value: any } = await new Promise(
        resolve => {
          setTimeout(async () => {
            console.log(`attempt number ${i}`);
            const result = await query();
            let value: any = result;
            for (let i = 0; i < props.length; i++) {
              const prop = props[i];
              value = value[prop];
            }
            console.log(`value ${value}`);
            resolve({ result, value });
          }, delay);
        }
      );

      if (!retryValues.includes(value)) return result; // success!
      const random = Math.random() * 1000; // random number of milliseconds
      const backoff = Math.pow(2, i) * 1000;
      delay = Math.min(backoff + random, maxBackoff);
      console.log(delay);
      i++;
    }
    return;
  };
}
