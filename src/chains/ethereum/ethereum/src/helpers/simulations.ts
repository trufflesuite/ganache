import { Common } from "@ethereumjs/common";
import type { InterpreterStep } from "@ethereumjs/evm";
import { Address } from "@ganache/ethereum-address";
import {
  AccessList,
  AccessLists,
  calculateIntrinsicGas
} from "@ganache/ethereum-transaction";
import { CallError } from "@ganache/ethereum-utils";
import { BUFFER_EMPTY, Data, hasOwn, keccak, Quantity } from "@ganache/utils";
import { makeStepEvent } from "../provider-events";
import { KECCAK256_NULL } from "ethereumjs-util";
import { GanacheTrie } from "./trie";
import Blockchain from "../blockchain";
import { Block, RuntimeBlock } from "@ganache/ethereum-block";
import {
  EvmError as VmError,
  EvmErrorMessage as ERROR,
  EVMResult,
  EEIInterface,
  EVMInterface
} from "@ethereumjs/evm";
import { getPrecompiles } from "./precompiles";
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
  /**
   * RuntimeBlock that the transaction will be simulated against.
   */
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
interface EVMRunCallOpts {
  caller?: Address;
  data?: Buffer;
  gasPrice?: bigint;
  gasLimit?: bigint;
  to?: Address;
  value?: bigint;
  block?: any;
}

type CloneVmOptions = {
  blockchain: Blockchain;
  common: Common;
  simulationBlock: Block;
};

type CloneVmResult = {
  evm: EVMInterface;
  eei: EEIInterface;
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
  eei: EEIInterface;
  transaction: SimulationTransaction;
  overrides?: CallOverrides;
};

type RunCallSetupResult = {
  runCallOpts: EVMRunCallOpts;
  accessListExclusions: Address[];
  addressesOnlyStorage: Address[];
  intrinsicGas: bigint;
};

type InternalRunCallOptions = {
  blockchain: Blockchain;
  runCallOpts: EVMRunCallOpts;
  evm: EVMInterface;
  options: EthereumInternalOptions;
  emitStepEvent: boolean;
};

const warmAccessList = (eei: EEIInterface, accessList: AccessList) => {
  for (const { address, storageKeys } of accessList) {
    const addressBuf = Address.toBuffer(address);
    eei.addWarmedAddress(addressBuf);
    for (const slot of storageKeys) {
      eei.addWarmedStorage(addressBuf, Data.toBuffer(slot, 32));
    }
  }
};

/**
 * Validates a storage override to confirm that both the slot and value are
 * 32-byte hex strings and throws an error matching Geth's error if not.
 * @param slot
 * @param value
 * @param fieldName
 */
const validateStorageOverride = (
  slot: string,
  value: string,
  fieldName: string
) => {
  if (
    typeof slot === "string" &&
    slot !== "" &&
    slot.indexOf("0x") === 0 &&
    slot.length !== 66
  ) {
    throw new Error(
      `${fieldName} override slot must be a 64 character hex string. Received ${
        slot.length - 2
      } character string.`
    );
  }
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} override data not valid. Received: ${value}`);
  }
  if (
    typeof value === "string" &&
    value !== "" &&
    value.indexOf("0x") === 0 &&
    value.length !== 66
  ) {
    throw new Error(
      `${fieldName} override data must be a 64 character hex string. Received ${
        value.length - 2
      } character string.`
    );
  }
};

const applySimulationOverrides = async (
  overrides: CallOverrides,
  stateTrie: GanacheTrie,
  eei: EEIInterface
): Promise<void> => {
  for (const address in overrides) {
    if (!hasOwn(overrides, address)) continue;
    const { balance, nonce, code, state, stateDiff } = overrides[address];

    const vmAddr = Address.from(address);
    // group together overrides that update the account
    if (nonce != null || balance != null || code != null) {
      const account = await eei.getAccount(vmAddr);

      if (nonce != null) {
        account.nonce = nonce === "" ? 0n : Quantity.toBigInt(nonce);
      }
      if (balance != null) {
        account.balance = balance === "" ? 0n : Quantity.toBigInt(balance);
      }
      if (code != null) {
        // geth treats empty strings as "0x" code for overrides
        const codeBuffer = Data.toBuffer(code === "" ? "0x" : code);
        // The ethereumjs-vm StateManager does not allow to set empty code,
        // therefore we will manually set the code hash when "clearing" the contract code
        const codeHash =
          codeBuffer.length > 0 ? keccak(codeBuffer) : KECCAK256_NULL;
        account.codeHash = codeHash;
        await stateTrie.database().put(codeHash, codeBuffer);
      }
      await eei.putAccount(vmAddr, account);
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
            await eei.clearContractStorage(vmAddr);
            clearedState = true;
          }
          const slotBuf = Data.toBuffer(slot, 32);
          const valueBuf = Data.toBuffer(value);

          await eei.putContractStorage(vmAddr, slotBuf, valueBuf);
        }
      } else {
        for (const slot in stateDiff) {
          // don't set storage for invalid values
          if (!hasOwn(stateDiff, slot)) continue;
          const value = stateDiff[slot];
          validateStorageOverride(slot, value, "StateDiff");

          const slotBuf = Data.toBuffer(slot, 32);
          const valueBuf = Data.toBuffer(value);

          await eei.putContractStorage(vmAddr, slotBuf, valueBuf);
        }
      }
    }
  }
};

/**
 * Clones the VM at the specified block.
 * @param CloneVmOptions
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
    false, // we'll activate precompiles manually later so we can track data
    common
  );
  const { eei, evm } = vm;
  // take a checkpoint so the `runCall` never writes to the trie. We don't
  // commit/revert later because this stateTrie is ephemeral anyway.
  await eei.checkpoint();
  return { evm, eei, stateTrie };
};

/**
 * Sets up the state trie and state manager to run the VM's `runCall` function
 * by warming addresses, applying simulation overrides, and updating from
 * account balances.
 * @param RunCallSetupOptions
 * @returns The run call options needed by the VM, the intrinsic gas used by the
 * transaction, and the `accessListExclusions`/`addressesOnlyStorage` variables
 * used by the state manager to generate access lists.
 */
const runCallSetup = async ({
  common,
  stateTrie,
  eei,
  transaction,
  overrides
}: RunCallSetupOptions): Promise<RunCallSetupResult> => {
  const caller = transaction.from;
  const data = transaction.data;
  const gasLimit = transaction.gas.toBigInt();
  const hasToAddress = transaction.to != null;

  const intrinsicGas = calculateIntrinsicGas(data, hasToAddress, common);
  // subtract out the transaction's base fee from the gas limit before
  // simulating the tx, because `runCall` doesn't account for raw gas costs.
  const gasLeft = gasLimit - intrinsicGas;
  const { to } = transaction;
  const accessListExclusions: Address[] = [];
  const addressesOnlyStorage: Address[] = [];
  if (gasLeft >= 0n) {
    if (common.isActivatedEIP(2929)) {
      for (const precompile of getPrecompiles()) {
        eei.addWarmedAddress(precompile.buf);
        accessListExclusions.push(precompile);
      }
      accessListExclusions.push(caller);
      if (to) {
        eei.addWarmedAddress(to.buf);
        addressesOnlyStorage.push(to);
      }
    }
    // If there are any overrides requested for eth_call, apply
    // them now before running the simulation.
    if (overrides) {
      await applySimulationOverrides(overrides, stateTrie, eei);
    }

    // we need to update the balance and nonce of the sender _before_
    // we run this transaction so that things that rely on these values
    // are correct (like contract creation!).
    const fromAccount = await eei.getAccount(caller);
    fromAccount.nonce += 1n;
    const txCost = gasLimit * transaction.gasPrice.toBigInt();
    fromAccount.balance -= txCost;
    await eei.putAccount(caller, fromAccount);

    const runCallOpts: EVMRunCallOpts = {
      caller,
      data: transaction.data && transaction.data.toBuffer(),
      gasPrice: transaction.gasPrice.toBigInt(),
      gasLimit: gasLeft,
      to,
      value: transaction.value === null ? 0n : transaction.value.toBigInt(),
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
    } as EVMResult;

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
  evm,
  options,
  emitStepEvent
}: InternalRunCallOptions): Promise<EVMResult> => {
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

  evm.events.on("step", stepEventListener);

  const callResult = await evm.runCall(runCallOpts);

  blockchain.emit("ganache:vm:tx:after", {
    context
  });
  // this function can be called in a loop, so remove step listeners
  // so we don't pile up too many
  evm.events.removeListener("step", stepEventListener);

  if (callResult.execResult.exceptionError) {
    throw new CallError(callResult);
  } else {
    return callResult;
  }
};

/**
 * Clones the VM and simulates a transaction, returning the execution result
 * from the VM.
 * @param RunCallOptions
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
  const { evm, eei, stateTrie } = await cloneVm({
    blockchain,
    common,
    simulationBlock
  });

  const { runCallOpts } = await runCallSetup({
    common,
    stateTrie,
    eei,
    transaction,
    overrides
  });

  // we want to warm the access list provided by the user
  if (common.isActivatedEIP(2930) && transaction.accessList) {
    warmAccessList(eei, transaction.accessList);
  }

  const callResult = await _runCall({
    blockchain,
    runCallOpts,
    evm,
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
 *
 * NOTE: The process for generating an access list is additive, so any access
 * list provided by the user will be included in the resultant access list,
 * regardless of if the provided access list is relevant or not. In other words,
 * if the user provides (or the first run of `_runCall` generates) an access
 * list with addresses [a,b,c], and _that_ access list is run to generate an
 * access list [a,b,d], the final access list will be [a,b,c,d].
 * @param initialAccessList An access list to compare against the generated
 * access list.
 * @returns The final access list generated, plus an estimate of the gas
 * consumed by running the transaction _with_ the generated access list
 * included.
 */
export const createAccessList = async ({
  blockchain,
  common,
  simulationBlock,
  transaction,
  options,
  emitStepEvent
}: CreateAccessListOptions): Promise<CreateAccessListResult> => {
  const { evm, eei, stateTrie } = await cloneVm({
    blockchain,
    common,
    simulationBlock
  });

  const {
    runCallOpts,
    intrinsicGas,
    accessListExclusions,
    addressesOnlyStorage
  } = await runCallSetup({ common, stateTrie, eei, transaction });

  // no real reason why this is our max, feel free to change
  const MAX_ITERATIONS = 1000;
  let previousAccessList = transaction.accessList || [];
  let callResult: EVMResult;
  let iterations = 0;
  do {
    // checkpoint so we can get back to this vm state after every time we
    // run this loop
    await eei.checkpoint();
    warmAccessList(eei, previousAccessList);
    callResult = await _runCall({
      blockchain,
      runCallOpts,
      evm,
      options,
      emitStepEvent
    });
    const accessList = eei.generateAccessList(
      accessListExclusions,
      addressesOnlyStorage
    );
    // either the access list passed by the user is the same as what was
    // generated by the VM, or the VM generated the same access list twice
    // in a row, so this is our "best" access list.
    if (AccessLists.areAccessListsSame(previousAccessList, accessList)) {
      const gasUsed = _getAccessListGasUsed(
        accessList,
        intrinsicGas,
        callResult
      );
      return { accessList, gasUsed };
    } else {
      // we are going to run this loop again so revert our changes
      await eei.revert();
      eei.clearWarmedAccounts();
      previousAccessList = accessList;
    }
    iterations++;
  } while (iterations < MAX_ITERATIONS);
  // we've tried too many times, so return our latest attempt
  const gasUsed = _getAccessListGasUsed(
    previousAccessList,
    intrinsicGas,
    callResult
  );
  return { accessList: previousAccessList, gasUsed };
};

/**
 * @returns {Quantity} The gas used by the transaction with the EIP2930 data
 * fee.
 */
const _getAccessListGasUsed = (
  accessList: AccessList,
  intrinsicGas: bigint,
  callResult: EVMResult
) => {
  const { dataFeeEIP2930 } = AccessLists.getAccessListData(accessList);
  const baseFeeBigInt = intrinsicGas + dataFeeEIP2930;
  const gasUsedBigInt = callResult.execResult.executionGasUsed + baseFeeBigInt;
  const gasUsed = Quantity.from(gasUsedBigInt);
  return gasUsed;
};
