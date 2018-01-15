var WebSocketServer = require('websocket').server;
var to = require("./utils/to.js");

module.exports = function (httpServer, provider, logger) {
  var connectionManager = new ConnectionManager(provider, logger);

  var wsServer = new WebSocketServer({
    httpServer: httpServer,
    autoAcceptConnections: true,
  });

  wsServer.on('connect', connectionManager.manageConnection);

  return wsServer;
};


function ConnectionManager(provider, logger) {
  const self = this;
  self.provider = provider;
  self.logger = logger;
  self.connectionsBySubscriptionId = {}
  self.connections = {};
  self.connectionCounter = 0;

  self._updateSubscriptions = self._updateSubscriptions.bind(self)
  self.manageConnection = self.manageConnection.bind(self);
  self._logPayload = self._logPayload.bind(self);
  self._handleRequest = self._handleRequest.bind(self);

  provider.on('data', function (err, notification) {
    self._updateSubscriptions.call(self, notification);
  });
}


ConnectionManager.prototype.manageConnection = function (connection) {
  const self = this;
  connection.id = ++self.connectionCounter;
  self.connections[ connection.id ] = {
    connection: connection,
    subscriptions: {}
  };

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
    Object.keys(self.connections[connection.id].subscriptions).forEach((subscriptionId) => {
      self.provider.send({
        jsonrpc: "2.0",
        method: "eth_unsubscribe",
        params: [subscriptionId],
        id: new Date().getTime()
      }, function(err, result) {
        delete self.connectionsBySubscriptionId[subscriptionId];
      });
    });

    delete self.connections[ connection.id ];
  });
};


ConnectionManager.prototype._handleRequest = function (connection, payload) {
  const self = this;

  // handle subscription requests, otherwise delegate to provider
  switch (payload.method) {
    case 'eth_subscribe':
      self.provider.send(payload, function (err, result) {
        if (!err && result.result) {
          self.connections[connection.id].subscriptions[result.result] = true;
          self.connectionsBySubscriptionId[result.result] = self.connections[connection.id];
        }
        connection.send(JSON.stringify(result));
      });
      break;
    case 'eth_unsubscribe':
      self.provider.send(payload, function (err, result) {
        if (err || result.error) {
          if (connection && connection.send) {
            connection.send(JSON.stringify(result))
          }
          return
        }

        connection = self.connectionsBySubscriptionId[payload.params[0]];
        delete self.connections[connection.id].subscriptions[payload.params[0]]
        delete self.connectionsBySubscriptionId[payload.params[0]];

        connection.send(JSON.stringify(result));
      });
      break;
    default:
      self.provider.send(payload, function (err, result) {
        connection.send(JSON.stringify(result));
      });
  }
};

// Log messages that come into the TestRPC via http
ConnectionManager.prototype._logPayload = function (payload) {
  const self = this;
  if (payload instanceof Array) {
    // Batch request
    for (var i = 0; i < payload.length; i++) {
      var item = payload[ i ];
      self.logger.log(item.method);
    }
  } else {
    self.logger.log(payload.method);
  }
};

ConnectionManager.prototype._updateSubscriptions = function (notification) {
  this.connectionsBySubscriptionId[notification.params.subscription].connection.send(JSON.stringify(notification));
};
