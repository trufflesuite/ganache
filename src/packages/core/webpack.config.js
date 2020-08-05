// var config = require("../../../webpack.config");

// module.exports = config;

const path = require('path');

module.exports = {
  target: "node",
  entry: './src/index.ts',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.node$/,
        loader: 'node-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js' ],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'lib'),
    library: 'Ganache',
    libraryTarget: "umd",
    umdNamedDefine: true
  },
  //externals: ['uWebSockets.js', "prom-client", "bigint-buffer", "ws", "leveldown"],
  externals: [
    (context, request, callback) => {
      // webpack these modules:
      // we actually only care about scrypt and eth-block-tracker here, as those are the only native modules
      // but webpack won't detect them if we don't traverse the dependency tree to get to them
      if (/^(prom-client|bigint-buffer|ws|leveldown)(\/.*)?$/.test(request)) {
        return callback();
      }
      // we want to webpack all local files (files starting with a .)
      if (/^(\.|@ganache)/.test(request)) {
        return callback();
      }
      // we don't want to webpack any other modules
      return callback(null, "commonjs " + request);
    },
    'uWebSockets.js'
  ],
  optimization: {
    minimize: false
  },
};