import assert from "assert";
import createProcessName from "../src/process-name";

// generates a "random" number generator function that, when called, returns (in
// order) each value from the provided array, followed by -1 when there are none
// left.
function createRandom(...values: number[]): () => number {
  return () => (values.length > 0 ? (values.shift() as number) : -1);
}

const MAX_RANDOM = 0.9999999999999999;

// the values passed to createRandom specify the "random" number required to
// pick the specified part. This is calculated by:
// `source.indexOf("term") / source.length`
const wellKnownNames = [
  {
    random: createRandom(0, 0, 0),
    name: "baked_almond_bar"
  },
  {
    random: createRandom(MAX_RANDOM, MAX_RANDOM, MAX_RANDOM),
    name: "sticky_tiramisu_waffle"
  },
  {
    random: createRandom(
      0.2727272727272727,
      0.21428571428571427,
      0.4444444444444444
    ),
    name: "deepfried_chocolate_ganache"
  },
  {
    random: createRandom(
      0.18181818181818182,
      0.07142857142857142,
      0.9259259259259259
    ),
    name: "creamy_banana_truffle"
  }
];

// it's not necessarily important that this generates the correct names, but
// it's good to test that it's doing what we expect.
describe("createProcessName", () => {
  for (const wellKnownName of wellKnownNames) {
    it(`should create the correct instance name: ${wellKnownName.name}`, () => {
      const generatedName = createProcessName(wellKnownName.random);

      assert.strictEqual(generatedName, wellKnownName.name);
    });
  }

  it("should create a process name, without a mocked RNG", () => {
    const generatedName = createProcessName();
    // each part must be at least 3 chars long, and at most 20 chars
    const nameRegex = /^([a-z]{3,20}_){2}[a-z]{3,20}$/;
    assert(
      nameRegex.test(generatedName),
      `Exepected to have generated a reasonable name, got "${generatedName}"`
    );
  });
});
