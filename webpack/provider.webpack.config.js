const path = require("path");
const applyBaseConfig = require("./base.webpack.config")
const outputDir = path.join(__dirname, "..", "build");
const outputFilename = "ganache.provider.js";

module.exports = applyBaseConfig({
  entry: "./lib/provider.js",
  target: "node",
  output: {
    path: outputDir,
    filename: outputFilename,
    library: "GanacheProvider",
    libraryTarget: "umd",
    umdNamedDefine: true
  }
})
