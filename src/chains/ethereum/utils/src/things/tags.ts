export enum InternalTag {
  earliest = "earliest",
  finalized = "finalized",
  latest = "latest",
  safe = "safe",
  pending = "pending"
}

export type Tag = keyof typeof InternalTag;

export namespace Tag {
  export const earliest = "earliest";
  export const finalized = "finalized";
  export const latest = "latest";
  export const safe = "safe";
  export const pending = "pending";
}
