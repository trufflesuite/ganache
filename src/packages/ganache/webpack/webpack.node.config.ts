import base from "./webpack.common.config";
import webpack from "webpack";
import path from "path";
import merge from "webpack-merge";

let moduleCounter = 0;
let nodeModules = {};

const config: webpack.Configuration = merge({}, base, {
  target: "node10.7",
  entry: {
    core: "./index.ts",
    cli: "./src/cli.ts"
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "../", "dist", "node")
  },
  plugins: [
    // add a shebang at the top of the generated `ganache-cli.min.js`
    new webpack.BannerPlugin({
      entryOnly: true,
      include: "cli.js",
      banner: "#!/usr/bin/env node",
      raw: true
    })
  ],
  optimization: {
    splitChunks: {
      // chunk everything that the two output files (core and cli) will
      // reference common packages without duplication.
      chunks: "all"
    },
    // optimize use of generated ids for smallest package size
    chunkIds: "total-size"
  },
  externals: [
    "bigint-buffer",
    "leveldown",
    "secp256k1",
    "keccak",
    "bufferutil",
    "utf-8-validate",
    "@ganache/filecoin"
  ],
  module: {
    rules: [
      {
        // webpack load native modules
        test: /\.node$/,
        loader: "node-loader",
        options: {
          name:
            process.env.NODE_ENV === "development"
              ? "[path][name].[ext]"
              : "[md4:hash:base64:8].[ext]"
        }
      },
      {
        test: /src\/cli.ts$/,
        use: "shebang-loader"
      }
    ]
  }
});

export default config;
