// make sourcemaps work!
require('source-map-support/register')

let Ganache;
// we use optional dependencies which may, or may not exist, so try native first
try {
  Ganache = {
    Provider: require("./lib/provider"),
    Server: require("./lib/server")
  };
  console.log("Using Ganache with native dependencies");
}
catch (e) {
  // grabbing the Native deps failed, so we are using our webpacked build.
  Ganache = require("./build/ganache.core.node.js");
  console.log("Using Ganache with JS dependencies");
}

// This interface exists so as not to cause breaking changes.
module.exports = {
  server: function(options) {
    return Ganache.Server.create(options);
  },
  provider: function(options) {
    return new Ganache.Provider(options);
  }
};
