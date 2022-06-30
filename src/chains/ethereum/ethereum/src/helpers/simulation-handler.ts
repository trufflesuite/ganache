import Common from "@ethereumjs/common";
import VM from "@ethereumjs/vm";
import { DefaultStateManager } from "@ethereumjs/vm/dist/state/index";
import { Address as EthereumJsAddress } from "ethereumjs-util";
import { GanacheTrie } from "./trie";
import Blockchain from "../blockchain";

export type SimulationTransaction = {
  /**
   * The address the transaction is sent from.
   */
  from: Address;
  /**
   * The address the transaction is directed to.
   */
  to?: Address;
  /**
   * Integer of the gas provided for the transaction execution. eth_call consumes zero gas, but this parameter may be needed by some executions.
   */
  gas: Quantity;
  /**
   * Integer of the gasPrice used for each paid gas
   */
  gasPrice: Quantity;
  /**
   * Integer of the value sent with this transaction
   */
  value?: Quantity;
  /**
   * Hash of the method signature and encoded parameters. For details see Ethereum Contract ABI in the Solidity documentation
   */
  data?: Data;
  block: RuntimeBlock;
  /**
   * Array of addresses and storage keys.
   */
  accessList?: AccessList;
};
/**
 * Stripped down version of the type from EthereumJs
 */
interface RunCallOpts {
  caller?: EthereumJsAddress;
  data?: Buffer;
  gasPrice?: BN;
  gasLimit?: BN;
  to?: EthereumJsAddress;
  value?: BN;
  block?: any;
}

export default class SimulationHandler {
  #stateTrie: GanacheTrie;
  #vm: VM;
  #stateManager: DefaultStateManager;
  #runCallOpts: RunCallOpts;
  #accessListExclusions: EthereumJsAddress[] = [];
  #intrinsicGas: bigint;

  readonly #blockchain: Blockchain;
  readonly #common: Common;
  readonly #emitEvents: boolean;
  readonly #emitStepEvent: boolean;
  readonly #transactionContext: object;
  constructor(
    blockchain: Blockchain,
    common: Common,
    emitEvents: boolean = false,
    emitStepEvents: boolean = false
  ) {
    this.#blockchain = blockchain;
    this.#common = common;
    this.#emitEvents = emitEvents;
    this.#transactionContext = emitEvents ? {} : null;
    this.#emitStepEvent = emitEvents && emitStepEvents;
  }


  #setupStepEventEmits = () => {
    if (this.#emitEvents) {
      this.#vm.on("step", (event: InterpreterStep) => {
        if (!this.#emitStepEvent) return;
        const ganacheStepEvent = makeStepEvent(this.#transactionContext, event);
        this.#blockchain.emit("ganache:vm:tx:step", ganacheStepEvent);
      });
    }
  };

  #emitBefore = () => {
    if (this.#emitEvents) {
      this.#blockchain.emit("ganache:vm:tx:before", {
        context: this.#transactionContext
      });
    }
  };

  #emitAfter = () => {
    if (this.#emitEvents) {
      this.#blockchain.emit("ganache:vm:tx:after", {
        context: this.#transactionContext
      });
    }
  };

  public toLightEJSAddress(address?: Address): EthereumJsAddress {
    if (address) {
      const buf = address.toBuffer();
      return { buf, equals: (a: { buf: Buffer }) => buf.equals(a.buf) } as any;
    } else {
      return null;
    }
  }
}
