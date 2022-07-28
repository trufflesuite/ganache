import webpack from "webpack";
import TerserPlugin from "terser-webpack-plugin";
import { join } from "path";

const VERSION = require(join(__dirname, "../package.json")).version;
const CLI_VERSION = require(join(__dirname, "../../cli/package.json")).version;
const CORE_VERSION = require(join(
  __dirname,
  "../../core/package.json"
)).version;
const GANACHE_FILECOIN_VERSION = require(join(
  __dirname,
  "../../../chains/filecoin/filecoin/package.json"
)).version;

let INFURA_KEY = process.env.INFURA_KEY;
// if we don't have an INFURA_KEY at build time we should bail!
if (
  !INFURA_KEY &&
  process.env.CREATE_BROKEN_BUILD !== "I WILL NOT PUBLISH THIS"
) {
  throw new Error(
    'The `INFURA_KEY` environment variable was not supplied at build time. To bypass this check set the environment variable `CREATE_BROKEN_BUILD` to `"I WILL NOT PUBLISH THIS"`.'
  );
}

// validate INFURA_KEY
if (INFURA_KEY) {
  if (!/^[a-f0-9]{32}$/.test(INFURA_KEY)) {
    throw new Error(
      "INFURA_KEY must be 32 characters long and contain only the characters a-f0-9"
    );
  }
}

const base: webpack.Configuration = {
  mode: "production",
  entry: "./index.ts",
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader"
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  output: {
    library: "Ganache",
    libraryTarget: "umd"
  },
  stats: {
    colors: true
  },
  optimization: {
    // if we have wasm imports, go ahead and optimize those for size
    mangleWasmImports: true,
    // make exports names tiny
    mangleExports: "size",
    // make module ids tiny
    moduleIds: "size",
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          sourceMap: true,
          // Truffle needs our stack traces in its tests:
          // https://github.com/trufflesuite/truffle/blob/b2742bc1187a3c1513173d19c58ce0d3a8fe969b/packages/contract-tests/test/errors.js#L280
          keep_fnames: true,
          output: {
            // terser will take strings like "\ufffd" (REPLACEMENT CHARACTER)
            // and compress them into their single character representation: "�"
            // (that should render as a question mark within a diamond). This is
            // nice, but Chromium extensions don't like it and error with "It
            // isn't UTF-8 encoded".
            ascii_only: true
          }
        }
      })
    ]
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      // replace process.env.DEBUG in our code, because we don't use it but
      // ethereumjs packages do, but we don't implement everything required
      DEBUG: false,
      // set ganache version
      VERSION,
      CLI_VERSION,
      CORE_VERSION,
      GANACHE_FILECOIN_VERSION
    }),
    new webpack.DefinePlugin({
      // replace process.env.INFURA_KEY in our code
      "process.env.INFURA_KEY": JSON.stringify(INFURA_KEY)
    })
  ]
};

export default base;
