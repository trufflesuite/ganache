import Account from "../../../ethereum/src/things/account";

/**
 * Options that ledger implementations must implement
 */
export default interface ApiOptions {
  accounts?: Account[];
}
