const { merge } = require("lodash");
const { join } = require("path");
const { IgnorePlugin } = require("webpack");
const { WebpackBundleSizeAnalyzerPlugin } = require("webpack-bundle-size-analyzer");
const babelLoader = require("./babel-loader");

const outputDir = join(__dirname, "..", "build");

module.exports = (override) => {
  return merge({}, {
    output: {
      path: outputDir
    },
    devtool: "source-map",
    module: {
      rules: [
        {
          test: /eth-block-tracker.*.js$/,
          use: babelLoader,
        }
      ]
    },
    resolve: {
      alias: {
        // replace native scrypt with pure js version
        scrypt: "js-scrypt",

        // replace native secp256k1 with elliptic.js
        secp256k1: join(__dirname, "..", "node_modules", "secp256k1", "elliptic.js")
      }
    },
    plugins: [
      // ignore these plugins completely
      new IgnorePlugin(/^(?:electron|ws)$/),

      // writes a size report
      new WebpackBundleSizeAnalyzerPlugin("./size-report.txt")
    ],
    mode: "production",
    node: {
      // mocha-webpack breaks `__dirname`, this makes it stop doing that
      __dirname: true
    }
  }, override);
};