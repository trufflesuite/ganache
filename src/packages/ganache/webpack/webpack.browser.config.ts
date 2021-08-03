import base from "./webpack.common.config";
import webpack from "webpack";
import path from "path";
import merge from "webpack-merge";

const config: webpack.Configuration = merge({}, base, {
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    fallback: {
      //#region node polyfills
      util: require.resolve("util/"),
      crypto: require.resolve("crypto-browserify"),
      path: require.resolve("path-browserify"),
      assert: require.resolve("assert/"),
      stream: require.resolve("stream-browserify/"),
      os: require.resolve("os-browserify/browser"),
      process: require.resolve("process/browser"),
      events: require.resolve("events/"),
      buffer: require.resolve("buffer/"),
      fs: false,
      http: false,
      https: false
      //#endregion node polyfills
    },
    alias: {
      "tmp-promise": require.resolve("./polyfills/browser-tmp-promise"),
      "bigint-buffer": require.resolve("./polyfills/browser-bigint-buffer"),
      // replace leveldown with a browser version
      leveldown: require.resolve("level-js/"),
      // browser version can't start a server, so just remove the websocket server since it can't work anyway
      "@trufflesuite/uws-js-unofficial": false,
      "@ganache/filecoin": false,
      // `url` is already a global property in browser
      url: false
    }
  },
  output: {
    filename: "ganache.min.js",
    path: path.resolve(__dirname, "../", "dist", "web")
  },
  plugins: [
    new webpack.ProvidePlugin({ Buffer: ["buffer", "Buffer"] }),
    new webpack.ProvidePlugin({ process: ["process"] })
  ]
});

export default config;
