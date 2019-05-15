enum Tag {
  EARLIEST = "earliest",
  LATEST = "latest",
  PENDING = "pending"
}
enum _Tag {
  earliest,
  latest,
  pending
}

namespace Tag {
  export function normalize(tag: keyof typeof _Tag|Tag): Tag {
    let t: Tag;
    if (typeof tag === "string") {
      t = (<any>Tag)[tag.toUpperCase()];
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
    return t;
  }
}

export default Tag;
