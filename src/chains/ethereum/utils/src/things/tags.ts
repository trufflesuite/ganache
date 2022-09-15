export enum InternalTag {
  earliest = "earliest",
  finalized = "finalized",
  safe = "safe",
  latest = "latest",
  pending = "pending"
}

export type Tag = keyof typeof InternalTag;

export namespace Tag {
  export const earliest = "earliest";
  export const safe = "safe";
  export const finalized = "finalized";
  export const latest = "latest";
  export const pending = "pending";
}
