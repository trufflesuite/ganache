var WebSocketServer = require('lib/webSocketServer').server;
var http = require('http');

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
  this.connections = [];

  var self = this;
  provider._on('block', function() {
    self._updateSubscriptions();
  });

  this.manageConnection = this.manageConnection.bind(this);
  this._logPayload = this._logPayload.bind(this);
  this._handleRequest = this._handleRequest.bind(this);
}


ConnectionManager.prototype.manageConnection = function (connection) {
  connection.id = this.connections.length;
  this.connections.push({
    connection: connection,
    subscriptions: [],
  });

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
    self.connections.splice(connection.id, 1);
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

      var subscriptions = this.subscriptions[ connection.id ];

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
      var options = payload.params[1];

      var newPayload = {
        jsonrpc: "2.0",
        id: payload.id,
        method: "eth_newFilter",
        params: [options]
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
    case 'syncing':
    case 'newHeads':
    default:
      cb(new Error('unsupported subscription type'));
      return;
  }

  var self = this;
  this.provider.sendAsync(newPayload, function (err, result) {
    self.connections[connectionId].subscriptions.push(result.result);
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

ConnectionManager.prototype._updateSubscriptions = function () {
  for (var i = 0; i < this.connections.length; i++) {
    var c = this.connections[i];

    for (var i = 0; i < c.subscriptions.length; i++) {
      var subscription = c.subscriptions[i];

      var payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getFilterChanges",
        params: [subscription],
      };

      this.provider.sendAsync(payload, function (err, result) {
        var response = {
          jsonrpc: "2.0",
          method: "eth_subscription",
          params: {
            subscription: subscription,
            result: result.result
          }
        };

        c.connection.send(JSON.stringify(response));
      });
    }

  }
};