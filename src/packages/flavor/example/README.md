# My Chain

This is an example implementation of a ganache `flavor` plugin for a fictional
chain called "My Chain".

To play with this example (which isn't published to npm). You'll need to
download this repository, run `npm i`, then `cd` to this `example/` directory,
run `npm i && npm run build`, and then you can use this folder as a ganache flavor. Example:

```bash
ganache --flavor ~/code/ganache/src/packages/flavor/example
```