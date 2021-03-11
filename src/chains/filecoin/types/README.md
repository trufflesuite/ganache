# `@ganache/filecoin-types`

This package is mainly for internal use currently. It stores separate type declarations for the [@ganache/filecoin](../filecoin) package. We use this in other packages, like [@ganache/cli](../../packages/cli), to use the types without having to import the whole package. This is necessary for us to be able to deliver `@ganache/cli` with references to `@ganache/filecoin` types but use `@ganache/filecoin` as an optional peer dependency.
