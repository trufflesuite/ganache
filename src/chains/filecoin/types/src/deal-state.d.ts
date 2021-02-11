export declare enum DealState {
  Unknown = 0,
  ProposalNotFound = 1,
  ProposalRejected = 2,
  ProposalAccepted = 3,
  Staged = 4,
  Sealing = 5,
  Active = 6,
  Failing = 7,
  NotFound = 8,
  FundsEnsured = 9,
  Validating = 10,
  Transferring = 11,
  WaitingForData = 12,
  VerifyData = 13,
  EnsureProviderFunds = 14,
  EnsureClientFunds = 15,
  ProviderFunding = 16,
  ClientFunding = 17,
  Publish = 18,
  Publishing = 19,
  Error = 20,
  Completed = 21
}
export declare let terminalStates: Array<DealState>;
export declare let nextSuccessfulState: Record<DealState, DealState>;
