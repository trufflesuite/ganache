# `@ganache/ts-transformer-type-const`

A TypeScript custom transformer to inline literal types as JS runtime values

# Requirement

TypeScript >= 3.2.0

# How to use this package

This package exports 2 functions.
One is `constToValue` which is used in TypeScript codes to obtain the value of given type, while the other is a TypeScript custom transformer which is used to compile the `constToValue` function correctly.

## How to use `constToValue`

```ts
import { constToValue } from "@ganache/ts-transformer-type-const";

type myType = "some value";
const myValue = constToValue<myType>();

console.log(myValue); // "some value"
```

## How to use the custom transformer

Unfortunately, TypeScript itself does not currently provide any easy way to use custom transformers (See https://github.com/Microsoft/TypeScript/issues/14419).

### ttypescript

See [examples/ttypescript](examples/ttypescript) for detail.
See [ttypescript's README](https://github.com/cevek/ttypescript/blob/master/README.md) for how to use this with module bundlers such as webpack or Rollup.

```json
// tsconfig.json
{
  "compilerOptions": {
    // ...
    "plugins": [
      { "transform": "@ganache/ts-transformer-type-const/transformer" }
    ]
  }
  // ...
}
```
