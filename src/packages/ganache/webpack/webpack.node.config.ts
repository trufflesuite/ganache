import base from "./webpack.common.config";
import webpack from "webpack";
import path from "path";
import merge from "webpack-merge";
import DeduplicatePlugin from "./deduplicate-plugin";

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
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      // we don't use the debug module internally, so let's just not include it
      // in any package.
      debug: require.resolve("./polyfills/debug"),
      // the `setimmediate` package is only used in the browser
      setimmediate: false
    }
  },
  plugins: [
    // add a shebang at the top of the generated `cli.js`
    new webpack.BannerPlugin({
      entryOnly: true,
      include: "cli.js",
      banner: "#!/usr/bin/env node",
      raw: true
    }),
    new DeduplicatePlugin(),
    // replace process.env.IS_BROWSER with `false` to cause the minifier to
    // remove code blocks that require `process.env.IS_BROWSER != true`
    new webpack.EnvironmentPlugin({
      IS_BROWSER: false
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
    //#region dependencies that have the potential to compile something at install time
    "@trufflesuite/bigint-buffer",
    "level",
    "secp256k1",
    "keccak",
    // our µWebSockets.js uses `ws`, as does some other libs. `ws` likes to use
    // `bufferutil` and `utf-8-validate`, if available, to make it go faster
    "bufferutil",
    "utf-8-validate",
    //#endregion
    "@ganache/filecoin",
    // things api-extractor can't handle, so we don't bundle them:
    "emittery"
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
