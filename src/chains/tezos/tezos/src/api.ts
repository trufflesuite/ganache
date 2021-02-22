import { types } from "@ganache/utils";
import { TezosInternalOptions } from "@ganache/tezos-options";
import Wallet from "./wallet";
import { assertArgLength } from "./helpers/assert-arg-length";

export default class TezosApi implements types.Api {
  readonly [index: string]: (...args: any) => Promise<any>;
  readonly #options: TezosInternalOptions;
  readonly #wallet: Wallet;

  /**
   * This is the Tezos API that the provider interacts with.
   * The only methods permitted on the prototype are the supported json-rpc
   * methods.
   * @param options
   * @param ready Callback for when the API is fully initialized
   */
  constructor(options: TezosInternalOptions, wallet: Wallet) {
    this.#options = options;
    const { initialAccounts } = (this.#wallet = wallet);
  }

  async version(): Promise<string> {
    return this.#options.wallet.totalAccounts.toString();
  }

  /**
   * Returns a list of addresses owned by client.
   * @returns Array of 20 Bytes - addresses owned by the client.
   */
  @assertArgLength(0)
  async tez_accounts() {
    return this.#wallet.initialAccounts.map(m => m.pkh);
  }
}
