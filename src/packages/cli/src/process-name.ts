export default function createFriendlyName() {
  const name = [...Array(3)].map((_, i) => {
    const partSource = nameParts[i];
    const partIndex = Math.floor(Math.random() * partSource.length);
    return partSource[partIndex];
  });

  return name.join("-");
}

const adjectives = [
  "baked",
  "candied",
  "deepfried",
  "frozen",
  "hot",
  "molten",
  "pureed",
  "salted",
  "spiced",
  "sticky"
];
const flavours = [
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
  "poppy-seed",
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

const nameParts = [adjectives, flavours, kinds];
