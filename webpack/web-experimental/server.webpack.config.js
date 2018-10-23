const { join } = require("path");
const applyBaseConfig = require("./webbase.webpack.config");

const outputDir = join(__dirname, "..", "..", "build");
const outputFilename = "ganache.server.web-experimental.js";

module.exports = applyBaseConfig({
  entry: "./lib/server.js",
  target: "web",
  output: {
    path: outputDir,
    filename: outputFilename,
    library: "GanacheServer",
    libraryTarget: "umd",
    umdNamedDefine: true
  }
});
