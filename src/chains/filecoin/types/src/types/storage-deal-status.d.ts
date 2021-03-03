export declare enum StorageDealStatus {
  Unknown = 0,
  ProposalNotFound = 1,
  ProposalRejected = 2,
  ProposalAccepted = 3,
  Staged = 4,
  Sealing = 5,
  Finalizing = 6,
  Active = 7,
  Expired = 8,
  Slashed = 9,
  Rejecting = 10,
  Failing = 11,
  FundsReserved = 12,
  CheckForAcceptance = 13,
  Validating = 14,
  AcceptWait = 15,
  StartDataTransfer = 16,
  Transferring = 17,
  WaitingForData = 18,
  VerifyData = 19,
  ReserveProviderFunds = 20,
  ReserveClientFunds = 21,
  ProviderFunding = 22,
  ClientFunding = 23,
  Publish = 24,
  Publishing = 25,
  Error = 26,
  ProviderTransferAwaitRestart = 27,
  ClientTransferRestart = 28,
  AwaitingPreCommit = 29
}
export declare const terminalStates: Array<StorageDealStatus>;
export declare const nextSuccessfulState: Record<
  StorageDealStatus,
  StorageDealStatus
>;
export declare function dealIsInProcess(state: StorageDealStatus): boolean;
