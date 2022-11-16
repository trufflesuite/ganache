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
      path: require.resolve("path-browserify"),
      assert: require.resolve("assert/"),
      stream: require.resolve("stream-browserify/"),
      os: require.resolve("os-browserify/browser"),
      process: require.resolve("process/browser"),
      events: require.resolve("events/"),
      buffer: require.resolve("buffer/"),
      fs: false,
      // Taken from https://webpack.js.org/configuration/resolve/#resolvefallback
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      // not needed by the browser as the browser does the work
      zlib: false
      //#endregion node polyfills
    },
    alias: {
      "tmp-promise": require.resolve("./polyfills/browser-tmp-promise"),
      "bigint-buffer": require.resolve("./polyfills/browser-bigint-buffer"),
      crypto: require.resolve("./polyfills/browser-crypto"),
      // browser version can't start a server, so just remove the websocket server since it can't work anyway
      "@trufflesuite/uws-js-unofficial": false,
      // replace URL with a browser version -- sorta. just look at the polyfill code
      url: require.resolve("./polyfills/url"),
      "@ganache/filecoin": false,
      // mcl-wasm may be needed when creating a new @ethereumjs/vm and requires a browser version for browsers
      "mcl-wasm": require.resolve("mcl-wasm/browser"),
      // ws doesn't work in the browser so we polyfill it
      ws: require.resolve("./polyfills/ws"),
      // we don't use the debug module internally, so let's just not include it
      // in any package.
      debug: require.resolve("./polyfills/debug")
    }
  },
  output: {
    filename: "ganache.min.js",
    path: path.resolve(__dirname, "../", "dist", "web")
  },
  plugins: [
    new webpack.ProvidePlugin({ Buffer: ["buffer", "Buffer"] }),
    new webpack.ProvidePlugin({ process: ["process"] }),
    // replace process.env.IS_BROWSER with `true` to cause the minifier to
    // remove code blocks that require `process.env.IS_BROWSER != false`
    new webpack.EnvironmentPlugin({
      IS_BROWSER: true
    })
  ]
});

export default config;
