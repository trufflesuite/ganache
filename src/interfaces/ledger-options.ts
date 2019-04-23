import Account from "../types/account";

/**
 * Options that ledger implementations must implement
 */
export default interface ILedgerOptions {
    accounts?: Account[]
}