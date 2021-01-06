export enum Tag {
  EARLIEST = "earliest",
  LATEST = "latest",
  PENDING = "pending"
}
enum _Tag {
  earliest,
  latest,
  pending
}

export namespace Tag {
  export function normalize(tag: keyof typeof _Tag | Tag): Tag {
    if (typeof tag === "string") {
      return (<any>Tag)[tag.toUpperCase()];
    } else {
      switch (tag) {
        case _Tag.earliest:
          return Tag.EARLIEST;
        case _Tag.latest:
          return Tag.LATEST;
        case _Tag.pending:
          return Tag.PENDING;
      }
    }
  }
}
