const { join } = require("path");
const applyBaseConfig = require("./webbase.webpack.config");

const outputDir = join(__dirname, "..", "..", "build");
const outputFilename = "ganache.core.web-experimental.js";

module.exports = applyBaseConfig({
  entry: ["core-js/fn/promise", "./index.js"],
  target: "web",
  output: {
    path: outputDir,
    filename: outputFilename,
    library: "Ganache",
    libraryTarget: "umd",
    umdNamedDefine: true
  }
});
