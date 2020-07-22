abstract class SerializableLiteral<S> {
  #data: S;

  constructor(literal: SerializableLiteral<S> | S) {
    if (literal instanceof SerializableLiteral) {
      this.#data = this.default(literal.toJSON() as S);
    } else {
      this.#data = this.default(literal);
    }
  }

  toJSON():S {
    return this.#data;
  }

  abstract default(literal:S):S;
}

export default SerializableLiteral;