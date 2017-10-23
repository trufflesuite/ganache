var ProviderEngine = require("web3-provider-engine");
var FilterSubprovider = require('web3-provider-engine/subproviders/filters.js');
//var SolcSubprovider = require('web3-provider-engine/subproviders/solc.js')

var BlockchainDouble = require('./blockchain_double.js');

var RequestFunnel = require('./subproviders/requestfunnel.js');
var DelayedBlockFilter = require("./subproviders/delayedblockfilter.js");
var ReactiveBlockTracker = require("./subproviders/reactiveblocktracker.js");
var GethDefaults = require("./subproviders/gethdefaults.js");
var GethApiDouble = require('./subproviders/geth_api_double.js');

var RuntimeError = require("./utils/runtimeerror");

function Provider(options) {
  var self = this;

  if (options == null) {
    options = {};
  }

  if (options.logger == null) {
    options.logger = {
      log: function() {}
    };
  }

  this.options = options;
  this.engine = new ProviderEngine();

  var gethApiDouble = new GethApiDouble(options);

  this.engine.manager = gethApiDouble;
  this.engine.addProvider(new RequestFunnel());
  this.engine.addProvider(new ReactiveBlockTracker());
  this.engine.addProvider(new DelayedBlockFilter());
  this.engine.addProvider(new FilterSubprovider());
  this.engine.addProvider(new GethDefaults());
  this.engine.addProvider(gethApiDouble);

  this.engine.setMaxListeners(100);
  this.engine.start();

  this.manager = gethApiDouble;
};

Provider.prototype.sendAsync = function(payload, callback) {
  var self = this;

  var externalize = function(payload) {
    var clone = {};
    var keys = Object.keys(payload);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      clone[key] = payload[key];
    }
    clone.external = true;
    return clone;
  };

  if (Array.isArray(payload)) {
    for (var i = 0; i < payload.length; i++) {
      payload[i] = externalize(payload[i]);
    }
  } else {
    payload = externalize(payload);
  }

  var intermediary = function(err, result) {
    if (err) {
      // If we find a runtime error, mimic the result that would be sent back from
      // normal Ethereum clients that don't return runtime errors (e.g., geth, parity).
      if (err instanceof RuntimeError && (payload.method == "eth_sendTransaction" || payload.method == "eth_sendRawTransaction")) {
        result.result = err.hashes[0];
      }
    } else if (self.options.verbose) {
      self.options.logger.log(" <   " + JSON.stringify(result, null, 2).split("\n").join("\n <   "));
    }
    callback(err, result);
  };

  if (self.options.verbose) {
    self.options.logger.log("   > " + JSON.stringify(payload, null, 2).split("\n").join("\n   > "));
  }

  this.engine.sendAsync(payload, intermediary);
};

Provider.prototype.send = function() {
  throw new Error("Synchronous requests are not supported.");
};

Provider.prototype.close = function(callback) {
  // This is a little gross reaching, but...
  this.manager.state.blockchain.close(callback);
};

Provider.prototype._on = function(event, callback) {
  this.engine.on(event, callback);
};

module.exports = Provider;
