const { merge } = require("lodash");
const { resolve } = require("path");
const { IgnorePlugin } = require("webpack");
// const { WebpackBundleSizeAnalyzerPlugin } = require("webpack-bundle-size-analyzer");

const outputDir = resolve(__dirname, "..", "build");

module.exports = (override) => {
  return merge({}, {
    output: {
      path: outputDir
    },
    devtool: "source-map",
    resolve: {
      alias: {
        // eth-block-tracker is es6 but automatically builds an es5 version for us on install. thanks eth-block-tracker!
        "eth-block-tracker": "eth-block-tracker/dist/es5/index.js",

        // replace native `scrypt` module with pure js `js-scrypt`
        "scrypt": "js-scrypt",

        // replace native `secp256k1` with pure js `elliptic.js`
        "secp256k1": "secp256k1/elliptic.js"
      }
    },
    plugins: [
      // ignore these plugins completely
      new IgnorePlugin(/^(?:electron|ws)$/),

      // writes a size report
      // new WebpackBundleSizeAnalyzerPlugin("./size-report.txt"),
    ],
    mode: "production"
  }, override);
};