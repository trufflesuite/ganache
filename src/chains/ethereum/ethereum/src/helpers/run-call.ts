import { RuntimeBlock } from "@ganache/ethereum-block";
import { Quantity, Data } from "@ganache/utils";
import { Address } from "@ganache/ethereum-address";
import Message from "@ethereumjs/vm/dist/evm/message";
import VM from "@ethereumjs/vm";
import { BN } from "ethereumjs-util";
import EVM from "@ethereumjs/vm/dist/evm/evm";

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

/**
 * Executes a message/transaction against the vm.
 * @param vm
 * @param transaction
 * @param gasLeft
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
