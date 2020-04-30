import Account from "../things/account";

/**
 * Options that ledger implementations must implement
 */
export default interface ApiOptions {
  accounts?: Account[];
}
