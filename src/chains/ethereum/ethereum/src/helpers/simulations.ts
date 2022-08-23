import Common from "@ethereumjs/common";
import VM from "@ethereumjs/vm";
import { InterpreterStep } from "@ethereumjs/vm/dist/evm/interpreter";
import { DefaultStateManager } from "@ethereumjs/vm/dist/state/index";
import { Address } from "@ganache/ethereum-address";
import { calculateIntrinsicGas } from "@ganache/ethereum-transaction";
import { CallError } from "@ganache/ethereum-utils";
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
import { EVMResult } from "@ethereumjs/vm/dist/evm/evm";
import {
  AccessList,
  AccessLists
} from "@ganache/ethereum-transaction/src/access-lists";
import { ERROR, VmError } from "@ethereumjs/vm/dist/exceptions";
import { warmPrecompiles } from "./precompiles";
import { maybeGetLogs } from "@ganache/console.log";
import { EthereumInternalOptions } from "@ganache/ethereum-options";

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

export type CreateAccessListResult = {
  accessList: AccessList;
  gasUsed: Quantity;
};

/**
 * Stripped down version of the type from EthereumJs
 */
interface VMRunCallOpts {
  caller?: EthereumJsAddress;
  data?: Buffer;
  gasPrice?: BN;
  gasLimit?: BN;
  to?: EthereumJsAddress;
  value?: BN;
  block?: any;
}

type CloneVmOptions = {
  blockchain: Blockchain;
  common: Common;
  simulationBlock: Block;
};

type CloneVmResult = {
  vm: VM;
  stateManager: DefaultStateManager;
  stateTrie: GanacheTrie;
};

type SimulatorCommonOptions = CloneVmOptions & {
  options: EthereumInternalOptions;
  emitStepEvent: boolean;
  transaction: SimulationTransaction;
};

type RunCallOptions = SimulatorCommonOptions & {
  overrides?: CallOverrides;
};

type CreateAccessListOptions = SimulatorCommonOptions;

type RunCallSetupOptions = {
  common: Common;
  stateTrie: GanacheTrie;
  stateManager: DefaultStateManager;
  transaction: SimulationTransaction;
  overrides?: CallOverrides;
};

type RunCallSetupResult = {
  runCallOpts: VMRunCallOpts;
  accessListExclusions: EthereumJsAddress[];
  addressesOnlyStorage: EthereumJsAddress[];
  intrinsicGas: bigint;
};

type InternalRunCallOptions = {
  blockchain: Blockchain;
  runCallOpts: VMRunCallOpts;
  vm: VM;
  options: EthereumInternalOptions;
  emitStepEvent: boolean;
};

const toLightEJSAddress = (address?: Address): EthereumJsAddress => {
  if (address) {
    const buf = address.toBuffer();
    return { buf, equals: (a: { buf: Buffer }) => buf.equals(a.buf) } as any;
  } else {
    return null;
  }
};

/**
 * Calls the StateManager's `addWarmedAddress` function for the transaction
 * caller, all precompiles, and the to address, if applicable.
 * @param stateManager
 * @param caller
 * @param to
 * @returns An array of precompile addresses
 */
const warmDefaults = (
  stateManager: DefaultStateManager,
  caller: EthereumJsAddress,
  to?: EthereumJsAddress
) => {
  // handle Berlin hardfork warm storage reads
  const precompiles: EthereumJsAddress[] = warmPrecompiles(stateManager);
  stateManager.addWarmedAddress(caller.buf);
  if (to) stateManager.addWarmedAddress(to.buf);

  return precompiles;
};

const warmAccessList = (
  stateManager: DefaultStateManager,
  accessList: AccessList
) => {
  for (const { address, storageKeys } of accessList) {
    const addressBuf = Address.toBuffer(address);
    stateManager.addWarmedAddress(addressBuf);
    for (const slot of storageKeys) {
      stateManager.addWarmedStorage(addressBuf, Data.toBuffer(slot, 32));
    }
  }
};

const validateStorageOverride = (
  slot: string,
  value: string,
  fieldName: string
) => {
  // assume Quantity will handle other types, these are just special string cases
  if (typeof slot === "string" && slot !== "" && slot.indexOf("0x") === 0) {
    // assume we're starting with 0x cause Quantity will verify if not
    if (slot.length !== 66) {
      throw new Error(
        `${fieldName} override slot must be a 64 character hex string. Received ${
          slot.length - 2
        } character string.`
      );
    }
  }
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} override data not valid. Received: ${value}`);
  }
  // assume Quantity will handle other types, these are just special string cases
  if (typeof value === "string" && value !== "" && value.indexOf("0x") === 0) {
    if (value.length !== 66) {
      throw new Error(
        `${fieldName} override data must be a 64 character hex string. Received ${
          value.length - 2
        } character string.`
      );
    }
  }
};

const applySimulationOverrides = async (
  overrides: CallOverrides,
  stateTrie: GanacheTrie,
  stateManager: DefaultStateManager
): Promise<void> => {
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
          validateStorageOverride(slot, value, "State");
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
          validateStorageOverride(slot, value, "StateDiff");

          const slotBuf = Data.toBuffer(slot, 32);
          const valueBuf = Data.toBuffer(value);

          await stateManager.putContractStorage(vmAddr, slotBuf, valueBuf);
        }
      }
    }
  }
};

/**
 * Clones the VM at the specified block.
 * @param `CloneVmOptions`
 * @returns The cloned VM, state manager, and state trie.
 */
const cloneVm = async ({
  blockchain,
  common,
  simulationBlock
}: CloneVmOptions): Promise<CloneVmResult> => {
  const stateTrie = blockchain.trie.copy(false);
  stateTrie.setContext(
    simulationBlock.header.stateRoot.toBuffer(),
    null,
    simulationBlock.header.number
  );

  const vm = await blockchain.createVmFromStateTrie(
    stateTrie,
    false, // precompiles have already been initialized in the stateTrie
    common
  );
  const stateManager = vm.stateManager as DefaultStateManager;
  // take a checkpoint so the `runCall` never writes to the trie. We don't
  // commit/revert later because this stateTrie is ephemeral anyway.
  await stateManager.checkpoint();
  return { vm, stateManager, stateTrie };
};

/**
 * Sets up the state trie and state manager to run the VM's `runCall` function
 * by warming addresses, applying simulation overrides, and updating from
 * account balances.
 * @param `RunCallSetupOptions`
 * @returns The run call options needed by the VM, the intrinsic gas used by the
 * transaction, and the `accessListExclusions`/`addressesOnlyStorage` variables
 * used by the state manager to generate access lists.
 */
const runCallSetup = async ({
  common,
  stateTrie,
  stateManager,
  transaction,
  overrides
}: RunCallSetupOptions): Promise<RunCallSetupResult> => {
  const caller = toLightEJSAddress(transaction.from);
  const data = transaction.data;
  let gasLimit = transaction.gas.toBigInt();
  const hasToAddress = transaction.to != null;

  const intrinsicGas = calculateIntrinsicGas(data, hasToAddress, common);
  // subtract out the transaction's base fee from the gas limit before
  // simulating the tx, because `runCall` doesn't account for raw gas costs.
  const gasLeft = gasLimit - intrinsicGas;
  const to = toLightEJSAddress(transaction.to);
  const accessListExclusions: EthereumJsAddress[] = [];
  const addressesOnlyStorage: EthereumJsAddress[] = [];
  if (gasLeft >= 0n) {
    if (common.isActivatedEIP(2929)) {
      const precompiles = warmDefaults(stateManager, caller, to);
      accessListExclusions.push(caller);
      if (to) {
        addressesOnlyStorage.push(to);
      }
      accessListExclusions.push(...precompiles);
    }
    // If there are any overrides requested for eth_call, apply
    // them now before running the simulation.
    if (overrides) {
      await applySimulationOverrides(overrides, stateTrie, stateManager);
    }
    if (common.isActivatedEIP(2930) && transaction.accessList) {
      warmAccessList(stateManager, transaction.accessList);
    }

    // we need to update the balance and nonce of the sender _before_
    // we run this transaction so that things that rely on these values
    // are correct (like contract creation!).
    const fromAccount = await stateManager.getAccount(caller);
    fromAccount.nonce.iaddn(1);
    const txCost = new BN(
      (gasLimit * transaction.gasPrice.toBigInt()).toString()
    );
    fromAccount.balance.isub(txCost);
    await stateManager.putAccount(caller, fromAccount);

    const runCallOpts = {
      caller,
      data: transaction.data && transaction.data.toBuffer(),
      gasPrice: new BN(transaction.gasPrice.toBuffer()),
      gasLimit: new BN(Quantity.toBuffer(gasLeft)),
      to,
      value:
        transaction.value == null
          ? new BN(0)
          : new BN(transaction.value.toBuffer()),
      block: transaction.block as any
    };
    return {
      runCallOpts,
      accessListExclusions,
      addressesOnlyStorage,
      intrinsicGas
    };
  } else {
    const callResult = {
      execResult: {
        runState: { programCounter: 0 },
        exceptionError: new VmError(ERROR.OUT_OF_GAS),
        returnValue: BUFFER_EMPTY
      }
    } as any;

    throw new CallError(callResult);
  }
};

/**
 * Runs the VM's `runCall` function, emitting transaction events to the
 * blockchain along the way, and throwing a `CallError` if necessary.
 * @param InternalRunCallOptions
 * @returns The `EVMResult` from running the transaction.
 */
const _runCall = async ({
  blockchain,
  runCallOpts,
  vm,
  options,
  emitStepEvent
}: InternalRunCallOptions): Promise<EVMResult> => {
  let callResult: EVMResult;

  const context = {};
  blockchain.emit("ganache:vm:tx:before", {
    context
  });

  const stepEventListener = (event: InterpreterStep) => {
    const logs = maybeGetLogs(event);
    if (logs) {
      options.logging.logger.log(...logs);
      blockchain.emit("ganache:vm:tx:console.log", {
        context,
        logs
      });
    }
    if (!emitStepEvent) return;
    const ganacheStepEvent = makeStepEvent(context, event);
    blockchain.emit("ganache:vm:tx:step", ganacheStepEvent);
  };

  vm.on("step", stepEventListener);

  callResult = await vm.runCall(runCallOpts);

  blockchain.emit("ganache:vm:tx:after", {
    context
  });
  // this function can be called in a loop, so remove step listeners
  // so we don't pile up too many
  vm.removeListener("step", stepEventListener);

  if (callResult.execResult.exceptionError) {
    throw new CallError(callResult);
  } else {
    return callResult;
  }
};

/**
 * Clones the VM and simulates a transaction, returning the execution result
 * from the VM.
 * @param `RunCallOptions`
 * @returns `Data` - the return value of the `EVMResult`'s execution result.
 */
export const runCall = async ({
  blockchain,
  common,
  simulationBlock,
  transaction,
  options,
  emitStepEvent,
  overrides
}: RunCallOptions): Promise<Data> => {
  const { vm, stateManager, stateTrie } = await cloneVm({
    blockchain,
    common,
    simulationBlock
  });

  const { runCallOpts } = await runCallSetup({
    common,
    stateTrie,
    stateManager,
    transaction,
    overrides
  });

  const callResult = await _runCall({
    blockchain,
    runCallOpts,
    vm,
    options,
    emitStepEvent
  });

  const callResultValue = callResult.execResult.returnValue;

  return callResultValue === undefined
    ? Data.Empty
    : Data.from(callResultValue);
};

/**
 * Clones the VM and iteratively simulates the transaction, generating an access
 * list after for each run. The function returns once the generated access list
 * is the same as that of the previous run or as the `initialAccessList`.
 * @param initialAccessList An access list to compare against the generated
 * access list.
 * @returns The final access list generated, plus an estimate of the gas
 * consumed by running the transaction _with_ the generated access list included.
 */
export const createAccessList = async ({
  blockchain,
  common,
  simulationBlock,
  transaction,
  options,
  emitStepEvent
}: CreateAccessListOptions): Promise<CreateAccessListResult> => {
  const { vm, stateManager, stateTrie } = await cloneVm({
    blockchain,
    common,
    simulationBlock
  });

  const {
    runCallOpts,
    intrinsicGas,
    accessListExclusions,
    addressesOnlyStorage
  } = await runCallSetup({ common, stateTrie, stateManager, transaction });

  // no real reason why this is our max, feel free to change
  const MAX_ITERATIONS = 1000;
  let previousAccessList = transaction.accessList || [];
  let iterations = 0;
  do {
    // checkpoint so we can get back to this vm state after every time we
    // run this loop
    await stateManager.checkpoint();
    const callResult = await _runCall({
      blockchain,
      runCallOpts,
      vm,
      options,
      emitStepEvent
    });
    const accessList = stateManager.generateAccessList(
      accessListExclusions,
      addressesOnlyStorage
    );
    // we're done making vm state changes so revert
    await stateManager.revert();
    // either the access list passed by the user is the same as what was
    // generated by the VM, or the VM generated the same access list twice
    // in a row, so this is our "best" access list.
    if (AccessLists.areAccessListsSame(previousAccessList, accessList)) {
      const { dataFeeEIP2930 } = AccessLists.getAccessListData(accessList);
      const baseFeeBigInt = intrinsicGas + dataFeeEIP2930;
      const gasUsedBigInt =
        Quantity.toBigInt(callResult.gasUsed.toBuffer()) + baseFeeBigInt;
      const gasUsed = Quantity.from(gasUsedBigInt);
      return { accessList, gasUsed };
    } else {
      previousAccessList = accessList;
    }
    iterations++;
  } while (iterations < MAX_ITERATIONS);
};
