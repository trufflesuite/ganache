var WebSocketServer = require('websocket').server;
var http = require('http');
var to = require("./utils/to.js");

module.exports = function (provider, logger) {
  var connectionManager = new ConnectionManager(provider, logger);

  var server = http.createServer();

  var wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: true,
  });

  wsServer.on('connect', connectionManager.manageConnection);

  return server;
};


function ConnectionManager(provider, logger) {
  this.provider = provider;
  this.logger = logger;
  this.connections = {};
  this.connectionCounter = 0;

  var self = this;
  provider._on('block', function (block) {
    self._updateSubscriptions(block);
  });

  this.manageConnection = this.manageConnection.bind(this);
  this._logPayload = this._logPayload.bind(this);
  this._handleRequest = this._handleRequest.bind(this);
}


ConnectionManager.prototype.manageConnection = function (connection) {
  connection.id = ++this.connectionCounter;
  this.connections[ connection.id ] = {
    connection: connection,
    subscriptions: [],
    subscriptionCounter: 0,
  };

  var self = this;

  connection.on('message', function (message) {
    try {
      var payload = JSON.parse(message.utf8Data);
    } catch (e) {
      connection.reject(400, 'Bad Request');
    }

    self._logPayload(payload);

    self._handleRequest(connection, payload);
  });

  connection.on('close', function () {
    // remove subscriptions
    delete self.connections[ connection.id ];
  });
};


ConnectionManager.prototype._handleRequest = function (connection, payload) {

  // handle subscription requests, otherwise delegate to provider
  switch (payload.method) {
    case 'eth_subscribe':
      this._subscribe(connection.id, payload, function (err, result) {
        connection.send(JSON.stringify(result));
      });
      break;
    case 'eth_unsubscribe':
      var toRemove = payload.params;

      var subscriptions = this.connections[ connection.id ].subscriptions;

      var response = {
        jsonrpc: "2.0",
        id: payload.id,
        result: true,
      };

      for (var i = 0; i < toRemove.length; i++) {
        var idx = subscriptions.indexOf(toRemove[ i ]);

        if (idx === -1) {
          response.result = false;
        }

        subscriptions.splice(idx, 1);
      }

      connection.send(JSON.stringify(response));
      break;
    default:
      this.provider.sendAsync(payload, function (err, result) {
        connection.send(JSON.stringify(result));
      });
  }
};

// create a new subscription
ConnectionManager.prototype._subscribe = function (connectionId, payload, cb) {

  switch (payload.params[ 0 ]) {
    case 'logs':
      var options = payload.params[ 1 ];

      var newPayload = {
        jsonrpc: "2.0",
        id: payload.id,
        method: "eth_newFilter",
        params: [ options ],
      };
      break;
    case 'newPendingTransactions':
      var newPayload = {
        jsonrpc: "2.0",
        id: payload.id,
        method: "eth_newPendingTransactionFilter",
        params: [],
      };
      break;
    case 'newHeads':
      var id = to.hex('heads_') + to.hex(this.connections[ connectionId ].subscriptionCounter++);
      this.connections[ connectionId ].subscriptions.push(id);
      var response = {
        jsonrpc: "2.0",
        id: payload.id,
        result: id,
      };
      cb(null, response);
      return;
    case 'syncing':
    default:
      cb(new Error('unsupported subscription type'));
      return;
  }

  var self = this;
  this.provider.sendAsync(newPayload, function (err, result) {
    self.connections[ connectionId ].subscriptions.push(result.result);
    cb(err, result);
  });

};


// Log messages that come into the TestRPC via http
ConnectionManager.prototype._logPayload = function (payload) {
  if (payload instanceof Array) {
    // Batch request
    for (var i = 0; i < payload.length; i++) {
      var item = payload[ i ];
      this.logger.log(item.method);
    }
  } else {
    this.logger.log(payload.method);
  }
};

ConnectionManager.prototype._updateSubscriptions = function (block) {
  var blockHeader = {
    number: to.hex(block.number),
    hash: to.hex(block.hash),
    parentHash: to.hex(block.parentHash),
    nonce: to.hex(block.nonce),
    sha3Uncles: to.hex(block.sha3Uncles),
    logsBloom: to.hex(block.logsBloom),
    transactionsRoot: to.hex(block.transactionsRoot),
    stateRoot: to.hex(block.stateRoot),
    receiptsRoot: to.hex(block.receiptsRoot),
    difficulty: to.hex(block.difficulty),
    miner: to.hex(block.miner),
    extraData: to.hex(block.extraData),
    gasLimit: to.hex(block.gasLimit),
    gasUsed: to.hex(block.gasUsed),
    timestamp: to.hex(block.timestamp),
  };

  var keys = Object.keys(this.connections);
  for (var idxK = 0; idxK < keys.length; idxK++) {
    var key = keys[ idxK ];
    var c = this.connections[ key ];

    for (var idxS = 0; idxS < c.subscriptions.length; idxS++) {
      var subscription = c.subscriptions[ idxS ];

      var payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getFilterChanges",
        params: [ subscription ],
      };

      // 0x1c40e4 is heads_ in hex. This is the prefix for all newHeads subscription ids
      if (subscription.startsWith('0x1c40e4')) {
        // newHeads subscriptions
        var response = {
          jsonrpc: "2.0",
          method: "eth_subscription",
          params: {
            subscription: subscription,
            result: blockHeader,
          },
        };

        c.connection.send(JSON.stringify(response));
      } else {
        var emitLog = function (err, result) {
          if (!Array.isArray(result.result)) {
            result.result = [ result.result ];
          }

          if (result.result.length === 0) return;

          for (var i = 0; i < result.result.length; i++) {

            var response = {
              jsonrpc: "2.0",
              method: "eth_subscription",
              params: {
                subscription: this.subscription,
                result: result.result[ i ],
              },
            };

            this.connection.send(JSON.stringify(response));
          }
        }
        this.provider.sendAsync(payload, emitLog.bind({ connection: c.connection, subscription: subscription }));
      }
    }
  }
};