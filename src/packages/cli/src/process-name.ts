function pick(source: string[], random: () => number) {
  const partIndex = Math.floor(random() * source.length);
  return source[partIndex];
}
/**
 * Generates a random name to assign to an instance of Ganache. The name is
 * generated from an adjective, a flavor and a type of desert, in the form of
 * `<adjective>_<flavor>_<kind>`, eg., `salted_caramel_ganache`.
 */
export default function createInstanceName(random: () => number = Math.random) {
  return `${pick(adjectives, random)}_${pick(flavors, random)}_${pick(
    kinds,
    random
  )}`;
}

const adjectives = [
  "baked",
  "candied",
  "creamy",
  "deepfried",
  "frozen",
  "hot",
  "molten",
  "pureed",
  "salted",
  "spiced",
  "sticky"
];
const flavors = [
  "almond",
  "apple",
  "banana",
  "blackforest",
  "caramel",
  "cherry",
  "chocolate",
  "cinnamon",
  "coconut",
  "coffee",
  "cream",
  "custard",
  "fruit",
  "ginger",
  "gingerbread",
  "jelly",
  "lemon",
  "lime",
  "milk",
  "nut",
  "orange",
  "peanut",
  "plum",
  "poppyseed",
  "rhubarb",
  "strawberry",
  "sugar",
  "tiramisu"
];
const kinds = [
  "bar",
  "biscuit",
  "brownie",
  "cake",
  "cheesecake",
  "cookie",
  "crumble",
  "cupcake",
  "doughnut",
  "drizzle",
  "dumpling",
  "friand",
  "ganache",
  "loaf",
  "macaroon",
  "mousse",
  "muffin",
  "pastry",
  "pie",
  "pudding",
  "sponge",
  "strudel",
  "tart",
  "torte",
  "trifle",
  "truffle",
  "waffle"
];
