export enum InternalTag {
  earliest = "earliest",
  latest = "latest",
  pending = "pending"
}

export type Tag = keyof typeof InternalTag;

export namespace Tag {
  export const latest = "latest";
  export const earliest = "earliest";
  export const pending = "pending";
}
