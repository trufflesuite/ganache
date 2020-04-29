import Account from "../types/account";

/**
 * Options that ledger implementations must implement
 */
export default interface ApiOptions {
  accounts?: Account[];
}
