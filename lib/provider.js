var ProviderEngine = require("web3-provider-engine");
var SubscriptionSubprovider = require('web3-provider-engine/subproviders/subscriptions');

var RequestFunnel = require('./subproviders/requestfunnel');
var DelayedBlockFilter = require("./subproviders/delayedblockfilter");
var GethDefaults = require("./subproviders/gethdefaults");
var GethApiDouble = require('./subproviders/geth_api_double');

var BlockTracker = require('./block_tracker');

var RuntimeError = require("./utils/runtimeerror");
var EventEmitter = require('events');

var clone = require('clone')

function Provider(options) {
  const self = this;
  EventEmitter.call(this);

  if (options == null) {
    options = {};
  }

  if (options.logger == null) {
    options.logger = {
      log: function() {}
    };
  }

  this.options = options;
  var gethApiDouble = new GethApiDouble(options);

  this.engine = new ProviderEngine({
    blockTracker: new BlockTracker({ blockchain: gethApiDouble.state.blockchain })
  });

  subscriptionSubprovider = new SubscriptionSubprovider();

  this.engine.manager = gethApiDouble;
  this.engine.addProvider(new RequestFunnel());
  this.engine.addProvider(new DelayedBlockFilter());
  this.engine.addProvider(subscriptionSubprovider);
  this.engine.addProvider(new GethDefaults());
  this.engine.addProvider(gethApiDouble);

  this.engine.setMaxListeners(100);
  this.engine.start();

  this.manager = gethApiDouble;
  this.sendAsync = this.send.bind(this);
  this.send = this.send.bind(this);

  subscriptionSubprovider.on('data', function(err, notification) {
    self.emit('data', err, notification);
  });
};

Provider.prototype = Object.create(EventEmitter.prototype);
Provider.prototype.constructor = Provider;

Provider.prototype.send = function(payload, callback) {
  var self = this;

  var externalize = function(payload) {
    return clone(payload)
  };

  if (Array.isArray(payload)) {
    var newPayload = []
    for (var i = 0; i < payload.length; i++) {
      newPayload.push(externalize(payload[i]));
      payload = newPayload;
    }
  } else {
    payload = externalize(payload);
  }

  var intermediary = function(err, result) {
    if (err) {
      // If we find a runtime error, mimic the result that would be sent back from
      // normal Ethereum clients that don't return runtime errors (e.g., geth, parity).
      if (err instanceof RuntimeError && (payload.method == "eth_sendTransaction" || payload.method == "eth_sendRawTransaction")) {
        delete result.error // the provider engine will add the `error` field automatically here
        result.result = err.hashes[0];
      } else {
        // clean up the error reporting done by the provider engine
        if (err.stack && err.message) {
          result.error.message = err.message
          result.error.data = {
            stack: err.stack,
            name: err.name
          }
        }
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

Provider.prototype.close = function(callback) {
  // This is a little gross reaching, but...
  this.manager.state.blockchain.close(callback);
};

module.exports = Provider;
