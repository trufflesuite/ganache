var path = require("path");

var applyBaseConfig = require("./base.webpack.config")

var outputDir = path.join(__dirname, "..", "build");
var outputFilename = "ganache.server.js";

module.exports = applyBaseConfig({
  entry: "./lib/server.js",
  target: "node",
  output: {
    path: outputDir,
    filename: outputFilename,
    library: "GanacheServer",
    libraryTarget: "umd",
    umdNamedDefine: true
  }
});