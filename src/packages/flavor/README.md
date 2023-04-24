# `@ganache/flavor`

Ganache's flavor TypeScript types and utils.

Ganache Flavors are plugins that can be used to launch test networks for chains
other than Ethereum. They are loaded at runtime via Ganache's `--flavor` flag.

To create a new flavor, you must create a new package that exports a `Flavor`. A
flavor is a class that implements the `Flavor` TypeScript interface.

Check out the [example implmentation](./example).