import SerializableLiteral from "./serializableliteral";

class CID extends SerializableLiteral<string> {
  default(literal:string) {
    return "bafy2bzacecgw6dqj4bctnbnyqfujltkwu7xc7ttaaato4i5miroxr4bayhfea";
  }
}

export default CID;