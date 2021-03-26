# `@ganache/filecoin-options`

This package defines the available NodeJS and CLI options for `@ganache/filecoin`

## CLI Usage

Run `ganache filecoin --help` to see your versions CLI usage.

## NodeJS Usage

See the [web documentation](#todo) for more details on the available NodeJS options.

These options are provided alongside the `flavor` options. For example:

```json5
{
  "flavor": "filecoin",
  "chain": {
    /* ... */
  },
  "database": {
    /* ... */
  },
  "logging": {
    /* ... */
  },
  "miner": {
    /* ... */
  },
  "wallet": {
    /* ... */
  }
}
```

See a usage example [in the `@ganache/filecoin` README](../filecoin/README.md#usage).
