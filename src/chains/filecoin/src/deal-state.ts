// Note that the runtime number values of these enums match
// *exactly* the number values of the same states on the Lotus server.
// Don't reorganize unless you know what you're doing.

export enum DealState {
  Unknown,
  ProposalNotFound,
  ProposalRejected,
  ProposalAccepted,
  Staged,
  Sealing,
  Active,
  Failing,
  NotFound,
  FundsEnsured, // Deposited funds as neccesary to create a deal, ready to move forward
  Validating, // Verifying that deal parameters are good
  Transferring, // Moving data
  WaitingForData, // Manual transfer
  VerifyData, // Verify transferred data - generate CAR / piece data
  EnsureProviderFunds, // Ensuring that provider collateral is sufficient
  EnsureClientFunds, // Ensuring that client funds are sufficient
  ProviderFunding, // Waiting for funds to appear in Provider balance
  ClientFunding, // Waiting for funds to appear in Client balance
  Publish, // Publishing deal to chain
  Publishing, // Waiting for deal to appear on chain
  Error, // deal failed with an unexpected error
  Completed // on provider side, indicates deal is active and info for retrieval is recorded
}

export let terminalStates: Array<DealState> = [
  // go-fil-markets/storagemarket/types.go
  DealState.ProposalNotFound,
  DealState.ProposalRejected,
  DealState.Error,
  DealState.Completed
];

export let nextSuccessfulState: Record<DealState, DealState> = [
  DealState.Validating,
  DealState.Staged,
  DealState.EnsureProviderFunds,
  DealState.EnsureClientFunds,
  DealState.FundsEnsured,
  DealState.ProviderFunding,
  DealState.ClientFunding,
  DealState.Publish,
  DealState.Publishing,
  DealState.Transferring,
  DealState.Sealing,
  DealState.Active
].reduce((obj, currentValue, index, array) => {
  // This creates an object linking each state to its next state

  let nextValue: DealState;
  if (index + 1 < array.length) {
    nextValue = array[index + 1];
  } else {
    nextValue = array[index];
  }

  obj[currentValue] = nextValue;

  return obj;
}, {} as Record<DealState, DealState>);
