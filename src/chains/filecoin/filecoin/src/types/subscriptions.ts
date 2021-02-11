export enum SubscriptionMethod {
  ChannelUpdated = "xrpc.ch.val",
  ChannelClosed = "xrpc.ch.close",
  SubscriptionCanceled = "xrpc.cancel"
}

export type SubscriptionId = string;
