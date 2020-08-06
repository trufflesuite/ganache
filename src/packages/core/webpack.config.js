const { IgnorePlugin } = require("webpack");

const path = require('path');

module.exports = {
  target: "node",
  entry: path.join(__dirname, 'lib/index.js'),
  devtool: 'inline-source-map',
  plugins: [
    // ignore these plugins completely
    new IgnorePlugin(/^(?:electron)$/)
  ],
  resolve: {
    extensions: [ '.js', '.json'],
    modules: [
      'node_modules',
    ],
    symlinks: true,
    alias: {
      "bignumber.js": "bignumber.js/bignumber"
    }
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build'),
    library: 'Ganache',
    libraryTarget: "commonjs2",
    libraryExport: "default"
  },
  externals: {
    "uWebSockets.js": "commonjs2 uWebSockets.js",
    "bigint-buffer": "commonjs2 bigint-buffer",
    "leveldown": "commonjs2 leveldown",
    "dlv": "commonjs2 dlv",
    "ws": "commonjs2 ws"
  },
    // (_context, request, callback) => {
    //   if (["uWebSockets.js", "bigint-buffer", "leveldown"].includes(request)) {
    //     return callback();
    //   }
    //   // if (/^(\.|@ganache)/.test(request)) {
    //   //   return callback();
    //   // }
    //   // we don't want to webpack any other modules
    //   return callback(null, "commonjs2 " + request);
    // }
    // ],
  optimization: {
    minimize: false
  },
};
