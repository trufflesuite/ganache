import makeKeccak from "keccak";

const RATE = 1088;
const CAPACITY = 512;

const instance = makeKeccak("keccak256") as {
  _state: {
    absorb: (buffer: Buffer) => void;
    squeeze: (length: number) => Buffer;
    initialize: (rate: number, capacity: number) => void;
  };
  _finalized: boolean;
};

/**
 * keccak256, but faster if you use it a lot.
 * @param buffer -
 */
export function keccak(buffer: Buffer) {
  instance._state.absorb(buffer);
  const digest = instance._state.squeeze(32);
  // reset and remove result from memory
  instance._state.initialize(RATE, CAPACITY);
  // make this re-usable
  instance._finalized = false;
  return digest;
}
