import { SerializableLiteral, LiteralDefinition, Literal } from "./serializableliteral";

interface CIDConfig {
  type: string;
}

class CID extends SerializableLiteral<CIDConfig>  {
  get config() {
    return {
      defaultValue: (literal) => {
        return literal || "bafy2bzacecgw6dqj4bctnbnyqfujltkwu7xc7ttaaato4i5miroxr4bayhfea";
      }
    }
  };
}

export default CID;