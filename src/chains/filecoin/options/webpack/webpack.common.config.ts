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
            loader: "ts-loader"
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  output: {
    filename: "ganache-filecoin-options.min.js",
    library: "Filecoin-flavored Ganache Options",
    libraryExport: "default",
    libraryTarget: "umd"
  },
  stats: {
    colors: true
  },
  optimization: {
    minimize: false,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          // Truffle needs our stack traces in its tests:
          // https://github.com/trufflesuite/truffle/blob/b2742bc1187a3c1513173d19c58ce0d3a8fe969b/packages/contract-tests/test/errors.js#L280
          keep_fnames: true
        }
      })
    ]
  }
};

export default base;
