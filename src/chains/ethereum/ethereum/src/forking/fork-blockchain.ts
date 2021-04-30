import { EthereumInternalOptions } from "@ganache/ethereum-options";
import { Address } from "@ganache/ethereum-address";
import Common from "@ethereumjs/common";
import Blockchain from "../blockchain";

export default class ForkBlockchain extends Blockchain {
  constructor(options: EthereumInternalOptions, coinbaseAddress: Address) {
    super(options, coinbaseAddress);
  }
}
