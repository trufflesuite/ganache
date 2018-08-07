const path = require("path");
const applyBaseConfig = require("./base.webpack.config")
const outputDir = path.join(__dirname, "..", "build");
const _ = require("lodash");

const config = applyBaseConfig({
  entry: "./index.js",
  target: "node",
  output: {
    path: outputDir,
    library: "Ganache",
    libraryTarget: "umd",
    umdNamedDefine: true
  }
});

module.exports = [
  _.merge({}, config, {
    output: {
      filename: "ganache.core.js"
    }
  })
];