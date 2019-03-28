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
    if(typeof tag === "string"){
      t = (<any>Tag)[tag.toUpperCase()];
    } else {
      switch (tag) {  
        case Tag.EARLIEST:
          return Tag.EARLIEST;
        case Tag.LATEST:
          return Tag.LATEST; 
        case Tag.PENDING:
          return Tag.PENDING;
      }
    }
  
    if (!t) {
      throw new Error("Invalid tag: " + tag);
    }
    return t;
  }
}

export default Tag;
