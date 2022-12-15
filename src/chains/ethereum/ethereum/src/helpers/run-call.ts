import { RuntimeBlock } from "@ganache/ethereum-block";
import { Quantity, Data, hasOwn, keccak } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import { VM } from "@ethereumjs/vm";
import { KECCAK256_NULL } from "@ethereumjs/util";
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
  const caller = transaction.from;
  const to = transaction.to ?? null;
  const value = transaction.value == null ? 0n : transaction.value.toBigInt();

  vm.evm.runCall({
    origin: caller,
    block: transaction.block as any,
    gasPrice: transaction.gasPrice.toBigInt(),
    caller,
    gasLimit: gasLeft,
    to,
    value,
    data: transaction.data && transaction.data.toBuffer()
  });
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
  const eei = vm.eei;
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
}
