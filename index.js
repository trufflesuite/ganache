// make sourcemaps work!
require('source-map-support/register')

const debug = require("debug")("ganache");

// we use optional dependencies which may, or may not exist, so try native first
try {
  // make sure these exist before we try to load ganache with native modules
  require("scrypt");
  require("web3");
  require("ethereumjs-wallet");

  module.exports = require("./interface.js");
  debug("Optional dependencies installed; exporting ganache-core with native optional dependencies.");
}
catch (nativeError) {
  debug(nativeError);

  // grabbing the native/optional deps failed, try using our webpacked build.
  try {
    module.exports = require("./build/ganache.core.node.js");
    debug("Native modules not installed; exporting ganache-core from `./build` directory.");
  }
  catch(webpackError) {
    debug("ganache-core could not be exported; optional dependencies nor webpack build available for export.");
    throw webpackError;
  }
}