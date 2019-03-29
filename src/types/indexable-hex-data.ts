type IndexableHexData<T> = string & {
    new(value: T): IndexableHexData<T>,
    toString(): string 
  }
export default IndexableHexData;