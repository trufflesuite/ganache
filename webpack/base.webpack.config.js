const path = require("path");
const webpack = require("webpack");
const WebpackBundleSizeAnalyzerPlugin = require("webpack-bundle-size-analyzer").WebpackBundleSizeAnalyzerPlugin;
const babelLoader = require("./babel-loader").default;

const outputDir = path.join(__dirname, "..", "build");
const _ = require("lodash")

module.exports = function(override) {
  return _.merge({}, {
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
        "scrypt": "js-scrypt",
        "secp256k1": path.join(__dirname, "..", "node_modules", "secp256k1", "elliptic.js")
      }
    },
    plugins: [
      // ignore these plugins completely
      new webpack.IgnorePlugin(/^(?:electron|ws)$/),
      // writes a size report
      new WebpackBundleSizeAnalyzerPlugin("./size-report.txt"),
    ],
    mode: "production"
  }, override)
};