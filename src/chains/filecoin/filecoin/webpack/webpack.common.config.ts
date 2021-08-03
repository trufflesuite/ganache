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
              compiler: "ttypescript",
              // Symlinked paths to our packages aren't resolving correctly...
              // E.g., if PackageA and PackageB both import PackageC, the
              // compiler assumes PackageA's PackageC is incompatible with
              // PackageB's PackageC.
              // Note: if all packages are precompiled before running webpack
              // this issue doesn't occur, which makes me think this might be a
              // ts-loader issue.
              transpileOnly: true
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  output: {
    filename: "ganache-filecoin.min.js",
    library: "Filecoin-flavored Ganache",
    libraryExport: "default",
    libraryTarget: "umd"
  },
  stats: {
    colors: true
  },
  optimization: {
    minimize: true,
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
