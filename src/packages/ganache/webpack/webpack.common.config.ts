import webpack from "webpack";
import TerserPlugin from "terser-webpack-plugin";

const base: webpack.Configuration = {
  mode: "production",
  entry: "./index.ts",
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              // we need to use ttypescript because we use ts transformers
              compiler: "ttypescript"
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  output: {
    library: "Ganache",
    libraryTarget: "umd"
  },
  stats: {
    colors: true
  },
  optimization: {
    // if we have wasm imports, go ahead and optimize those for size
    mangleWasmImports: true,
    // make exports names tiny
    mangleExports: "size",
    // make module ids tiny
    moduleIds: "size",
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          sourceMap: true,
          // Truffle needs our stack traces in its tests:
          // https://github.com/trufflesuite/truffle/blob/b2742bc1187a3c1513173d19c58ce0d3a8fe969b/packages/contract-tests/test/errors.js#L280
          keep_fnames: true
        }
      })
    ]
  }
};

export default base;
