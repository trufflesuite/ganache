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

  var gethApiDouble = new GethApiDouble(Object.assign({}, options, { _provider: self }));

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
  this.close = this.close.bind(this);
  this._queueRequest = this._queueRequest.bind(this);
  this._processRequestQueue = this._processRequestQueue.bind(this);

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
    var response = self.reportErrorInResponse(payload, err, result);
    if (self.options.verbose) {
      self.options.logger.log(" <   " + JSON.stringify(response, null, 2).split("\n").join("\n <   "));
    }
    callback(response.error ? err : null, response);
  };

  if (self.options.verbose) {
    self.options.logger.log("   > " + JSON.stringify(payload, null, 2).split("\n").join("\n   > "));
  }

  if (self.options.asyncRequestProcessing) {
    self.engine.sendAsync(payload, intermediary);
  } else {
    self._queueRequest(payload, intermediary);
  }
};

Provider.prototype.close = function(callback) {
  // This is a little gross reaching, but...
  this.manager.state.blockchain.close(callback);
};

Provider.prototype._queueRequest = function(payload, intermediary) {
  if (!this._requestQueue) {
    this._requestQueue = []
  }

  this._requestQueue.push({
    payload: payload,
    callback: intermediary
  });

  setImmediate(this._processRequestQueue)
}

Provider.prototype._processRequestQueue = function() {
  const self = this;

  if (self._requestInProgress) return

  self._requestInProgress = true

  let args = self._requestQueue.shift()

  if (args) {
    self.engine.sendAsync(args.payload, (err, result) => {
      if (self._requestQueue.length > 0) {
        setImmediate(self._processRequestQueue)
      }
      args.callback(err, result)
      self._requestInProgress = false;
    })
  } else {
    // still need to free the lock
    self._requestInProgress = false;

    if (self._requestQueue.length > 0) {
      setImmediate(self._processRequestQueue)
    }
  }
}

Provider.prototype.cleanUpErrorObject = function(err, response) {
  var errorObject = {
    error: {}
  }
  if (err.message) {
    // clean up the error reporting done by the provider engine so the error message isn't lost in the stack trace noise
    errorObject.error.message = err.message;
    errorObject.error.data = {
      stack: err.stack,
      name: err.name
    }
  } else if (!response.error) {
    errorObject.error = {
      message: err.toString()
    }
  }

  // use clone here because `Object.assign` doesn't deep copy
  return Object.assign({}, clone(response), errorObject)
}

// helper list of RPC methods which execute code and respond with a transaction has as their result
var transactionMethods = [
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'personal_sendTransaction'
];

// helper list of RPC methods which execute code regardless of what their response object looks like
var executingMethods = [
  'eth_sendTransaction',
  'eth_sendRawTransaction',
  'eth_call',
  'eth_estimateGas',
  'debug_traceTransaction'
];

Provider.prototype._isTransactionRequest = function(request) {
  return transactionMethods.indexOf(request.method) != -1;
}

Provider.prototype._isExecutingRequest = function(request) {
  return executingMethods.indexOf(request.method) != -1;
}

Provider.prototype.reportErrorInResponse = function(request, err, response) {
  const self = this;
  var newResponse = clone(response);

  if (!err) return newResponse;

  // make sure we always return the transaction hash on failed transactions so
  // the caller can get their tx receipt
  if (self._isTransactionRequest(request) && err.hashes) {
    newResponse.result = err.hashes[0];
  }

  // If we executed code as part of this request, check whether we're supposed
  // to cause web3 and friends to throw by including the error field in our
  // response. If we don't report an error, the caller must fetch inspect the
  // `status` field of the receipt to detect an error, and check the ganache
  // logging output to see the error message. This is how all major clients
  // work today, so this is the default option.
  if (self._isExecutingRequest(request) && !self.options.vmErrorsOnRPCResponse) {
    delete newResponse.error
    return newResponse
  } else {
    return self.cleanUpErrorObject(err, newResponse)
  }
}

module.exports = Provider;
