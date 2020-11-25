import webpack from "webpack";
import TerserPlugin from "terser-webpack-plugin";

// inlines files, like package.json
import packageJsonTransformer from "ts-transformer-inline-file/transformer";

const base: webpack.Configuration = {
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
              getCustomTransformers: program => ({
                before: [packageJsonTransformer(program)]
              })
            }
          }
        ],
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  output: {
    filename: "ganache.min.js",
    library: "Ganache",
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
