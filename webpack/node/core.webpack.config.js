const { join } = require("path");
const applyBaseConfig = require("../base.webpack.config");

const outputDir = join(__dirname, "..", "..", "build");
const outputFilename = "ganache.core.node.js";

module.exports = applyBaseConfig({
  entry: "./index.js",
  target: "node",
  output: {
    path: outputDir,
    filename: outputFilename,
    library: "Ganache",
    libraryTarget: "umd",
    umdNamedDefine: true
  }
});