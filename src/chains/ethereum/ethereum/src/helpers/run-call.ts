import { RuntimeBlock } from "@ganache/ethereum-block";
import { Quantity, Data, hasOwn, keccak, BUFFER_EMPTY } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import Message from "@ethereumjs/vm/dist/evm/message";
import VM from "@ethereumjs/vm";
import { BN } from "ethereumjs-util";
import EVM from "@ethereumjs/vm/dist/evm/evm";
import { KECCAK256_NULL } from "ethereumjs-util";
import { GanacheTrie } from "./trie";

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
 * Executes a message/transaction against the vm.
 * @param vm -
 * @param transaction -
 * @param gasLeft -
 * @returns
 */
export function runCall(
  vm: VM,
  transaction: SimulationTransaction,
  gasLeft: bigint
) {
  const caller = { buf: transaction.from.toBuffer() };
  const to =
    transaction.to == null ? undefined : { buf: transaction.to.toBuffer() };
  const value = new BN(
    transaction.value == null ? 0 : transaction.value.toBuffer()
  );

  const txContext = {
    gasPrice: new BN(transaction.gasPrice.toBuffer()),
    origin: caller
  } as any;

  const message = new Message({
    caller,
    gasLimit: new BN(Quantity.from(gasLeft).toBuffer()),
    to,
    value,
    data: transaction.data && transaction.data.toBuffer()
  });

  const evm = new EVM(vm, txContext, transaction.block as any);
  return evm.executeMessage(message);
}

const validateStorageOverride = (
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
    throw new Error(`${fieldName} override data not valid. Received: ${value}`);
  }
  // assume Quantity will handle other types, these are just special string cases
  if (typeof value === "string" && value !== "" && value.indexOf("0x") === 0) {
    if (value.length != 66) {
      throw new Error(
        `${fieldName} override data must be a 64 character hex string. Received ${
          value.length - 2
        } character string.`
      );
    }
  }
};

export async function applySimulationOverrides(
  stateTrie: GanacheTrie,
  vm: VM,
  overrides: CallOverrides
): Promise<void> {
  const stateManager = vm.stateManager;
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
            nonce === "" ? BUFFER_EMPTY : Quantity.from(nonce).toBuffer()
        } as any;
      }
      if (balance != null) {
        account.balance = {
          toArrayLike: () =>
            // geth treats empty strings as "0x0" balance for overrides
            balance === "" ? BUFFER_EMPTY : Quantity.from(balance).toBuffer()
        } as any;
      }
      if (code != null) {
        // geth treats empty strings as "0x" code for overrides
        const codeBuffer = Data.from(code === "" ? "0x" : code).toBuffer();
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
          const slotBuf = Data.from(slot, 32).toBuffer();
          const valueBuf = Data.from(value).toBuffer();

          await stateManager.putContractStorage(vmAddr, slotBuf, valueBuf);
        }
      } else {
        for (const slot in stateDiff) {
          // don't set storage for invalid values
          if (!hasOwn(stateDiff, slot)) continue;
          const value = stateDiff[slot];
          validateStorageOverride(slot, value, "StateDiff");

          const slotBuf = Data.from(slot, 32).toBuffer();
          const valueBuf = Data.from(value).toBuffer();

          await stateManager.putContractStorage(vmAddr, slotBuf, valueBuf);
        }
      }
    }
  }
}
