import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { Account, Address } from "@ganache/ethereum-utils";
import Common from "ethereumjs-common";
import Blockchain from "../blockchain";

export default class ForkBlockchain extends Blockchain {
  constructor(
    options: EthereumInternalOptions,
    common: Common,
    initialAccounts: Account[],
    coinbaseAddress: Address
  ) {
    super(options, common, initialAccounts, coinbaseAddress);
  }
}
