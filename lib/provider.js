var ProviderEngine = require("web3-provider-engine");
var FilterSubprovider = require('web3-provider-engine/subproviders/filters.js');
var VmSubprovider = require('web3-provider-engine/subproviders/vm.js');
//var SolcSubprovider = require('web3-provider-engine/subproviders/solc.js')

var BlockchainDouble = require('./blockchain_double.js');

var RequestFunnel = require('./subproviders/requestfunnel.js');
var DelayedBlockFilter = require("./subproviders/delayedblockfilter.js");
var ReactiveBlockTracker = require("./subproviders/reactiveblocktracker.js");
var GethDefaults = require("./subproviders/gethdefaults.js");
var GethApiDouble = require('./subproviders/geth_api_double.js');

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
  this.engine.addProvider(new VmSubprovider());
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

  var intermediary = callback;

  if (self.options.verbose) {
    self.options.logger.log("   > " + JSON.stringify(payload, null, 2).split("\n").join("\n   > "));

    intermediary = function(err, result) {
      if (!err) {
        self.options.logger.log(" <   " + JSON.stringify(result, null, 2).split("\n").join("\n <   "));
      }
      callback(err, result);
    };
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

module.exports = Provider;
