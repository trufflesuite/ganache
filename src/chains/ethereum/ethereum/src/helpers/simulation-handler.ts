import Common from "@ethereumjs/common";
import VM from "@ethereumjs/vm";
import { InterpreterStep } from "@ethereumjs/vm/dist/evm/interpreter";
import { DefaultStateManager } from "@ethereumjs/vm/dist/state/index";
import { Address } from "@ganache/ethereum-address";
import { BUFFER_EMPTY, Data, hasOwn, keccak, Quantity } from "@ganache/utils";
import { makeStepEvent } from "../provider-events";
import {
  Address as EthereumJsAddress,
  BN,
  KECCAK256_NULL
} from "ethereumjs-util";
import { GanacheTrie } from "./trie";
import Blockchain from "../blockchain";
import { Block, RuntimeBlock } from "@ganache/ethereum-block";
import { warmPrecompiles } from "./precompiles";

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

type CallOverride =
  | Partial<{
      code: string;
      nonce: string;
      balance: string;
      state: { [slot: string]: string };
      stateDiff: never;
    }>
  | Partial<{
      code: string;
      nonce: string;
      balance: string;
      state: never;
      stateDiff: { [slot: string]: string };
    }>;

export type CallOverrides = {
  [address: string]: CallOverride;
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
  /**
   * Calls the StateManager's `addWarmedAddress` function for the transaction
   * caller, all precompiles, and the to address, if applicable.
   * @param stateManager
   * @param caller
   * @param to
   * @returns An array of precompile addresses
   */
  #warmDefaults(caller: EthereumJsAddress, to?: EthereumJsAddress) {
    const stateManager = this.#stateManager;
    let precompiles: EthereumJsAddress[] = [];
    // handle Berlin hardfork warm storage reads
    precompiles = warmPrecompiles(stateManager);
    stateManager.addWarmedAddress(caller.buf);
    if (to) stateManager.addWarmedAddress(to.buf);

    return precompiles;
  }

  #warmAccessList(accessList: AccessList) {
    const stateManager = this.#stateManager;
    for (const { address, storageKeys } of accessList) {
      const addressBuf = Address.from(address).toBuffer();
      stateManager.addWarmedAddress(addressBuf);
      for (const slot of storageKeys) {
        stateManager.addWarmedStorage(addressBuf, Data.toBuffer(slot, 32));
      }
    }
  }

  async #applySimulationOverrides(overrides: CallOverrides): Promise<void> {
    const stateTrie = this.#stateTrie;
    const stateManager = this.#stateManager;

    for (const address in overrides) {
      if (!hasOwn(overrides, address)) continue;
      const { balance, nonce, code, state, stateDiff } = overrides[address];

      const vmAddr = { buf: Address.from(address).toBuffer() } as any;
      // group together overrides that update the account
      if (nonce != null || balance != null || code != null) {
        const account = await stateManager.getAccount(vmAddr);

        if (nonce != null) {
          account.nonce = {
            toArrayLike: () =>
              // geth treats empty strings as "0x0" nonce for overrides
              nonce === "" ? BUFFER_EMPTY : Quantity.toBuffer(nonce)
          } as any;
        }
        if (balance != null) {
          account.balance = {
            toArrayLike: () =>
              // geth treats empty strings as "0x0" balance for overrides
              balance === "" ? BUFFER_EMPTY : Quantity.toBuffer(balance)
          } as any;
        }
        if (code != null) {
          // geth treats empty strings as "0x" code for overrides
          const codeBuffer = Data.toBuffer(code === "" ? "0x" : code);
          // The ethereumjs-vm StateManager does not allow to set empty code,
          // therefore we will manually set the code hash when "clearing" the contract code
          const codeHash =
            codeBuffer.length > 0 ? keccak(codeBuffer) : KECCAK256_NULL;
          account.codeHash = codeHash;
          await stateTrie.db.put(codeHash, codeBuffer);
        }
        await stateManager.putAccount(vmAddr, account);
      }
      // group together overrides that update storage
      if (state || stateDiff) {
        if (state) {
          // state and stateDiff fields are mutually exclusive
          if (stateDiff) {
            throw new Error("both state and stateDiff overrides specified");
          }
          // it's possible that the user fed an override with a valid address
          // and slot, but not a value we can actually set in the storage. if
          // so, we don't want to set the storage, and we also don't want to
          // clear it out
          let clearedState = false;
          for (const slot in state) {
            if (!hasOwn(state, slot)) continue;
            const value = state[slot];
            this.#validateStorageOverride(slot, value, "State");
            if (!clearedState) {
              // override.state clears all storage and sets just the specified slots
              await stateManager.clearContractStorage(vmAddr);
              clearedState = true;
            }
            const slotBuf = Data.toBuffer(slot, 32);
            const valueBuf = Data.toBuffer(value);

            await stateManager.putContractStorage(vmAddr, slotBuf, valueBuf);
          }
        } else {
          for (const slot in stateDiff) {
            // don't set storage for invalid values
            if (!hasOwn(stateDiff, slot)) continue;
            const value = stateDiff[slot];
            this.#validateStorageOverride(slot, value, "StateDiff");

            const slotBuf = Data.toBuffer(slot, 32);
            const valueBuf = Data.toBuffer(value);

            await stateManager.putContractStorage(vmAddr, slotBuf, valueBuf);
          }
        }
      }
    }
  }

  #validateStorageOverride = (
    slot: string,
    value: string,
    fieldName: string
  ) => {
    // assume Quantity will handle other types, these are just special string cases
    if (typeof slot === "string" && slot !== "" && slot.indexOf("0x") === 0) {
      // assume we're starting with 0x cause Quantity will verify if not
      if (slot.length != 66) {
        throw new Error(
          `${fieldName} override slot must be a 64 character hex string. Received ${
            slot.length - 2
          } character string.`
        );
      }
    }
    if (value === null || value === undefined) {
      throw new Error(
        `${fieldName} override data not valid. Received: ${value}`
      );
    }
    // assume Quantity will handle other types, these are just special string cases
    if (
      typeof value === "string" &&
      value !== "" &&
      value.indexOf("0x") === 0
    ) {
      if (value.length != 66) {
        throw new Error(
          `${fieldName} override data must be a 64 character hex string. Received ${
            value.length - 2
          } character string.`
        );
      }
    }
  };
}
