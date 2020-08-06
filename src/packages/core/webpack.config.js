const path = require('path');

module.exports = {
  target: "node",
  entry: path.join(__dirname, 'lib/index.js'),
  devtool: 'inline-source-map',
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
    path: path.resolve(__dirname, "build"),
    library: 'Ganache',
    libraryTarget: "commonjs2",
    libraryExport: "default"
  },
  externals: {
    "uWebSockets.js": "commonjs2 uWebSockets.js",
    "bigint-buffer": "commonjs2 bigint-buffer",
    "leveldown": "commonjs2 leveldown",
    "ipfs": "commonjs2 ipfs",
  },
  optimization: {
    minimize: false
  }
};
