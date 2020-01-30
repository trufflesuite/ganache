// make sourcemaps work!
require("source-map-support/register");

var Provider = require("./provider");
var webSocketServer = require("./webSocketServer");
var httpServer = require("./httpServer");
var _ = require("lodash");

module.exports = {
  create: function(options) {
    options = _applyDefaultOptions(options || {});

    var logger = options.logger;
    var provider = new Provider(options);

    var server = httpServer(provider, logger);
    server.keepAliveTimeout = options.keepAliveTimeout;

    let connectionCounter = 0;
    const connections = {};
    server.on("connection", (conn) => {
      const key = connectionCounter++;
      connections[key] = conn;
      conn.on("close", () => delete connections[key]);
    });

    var oldListen = server.listen;

    server.listen = function() {
      var args = Array.prototype.slice.call(arguments);
      var callback = function() {};
      if (args.length > 0) {
        var last = args[args.length - 1];
        if (typeof last === "function") {
          callback = args.pop();
        }
      }

      var intermediary = function(err) {
        if (err) {
          return callback(err);
        }
        server.provider.manager.waitForInitialization(callback);
      };

      args.push(intermediary);

      oldListen.apply(server, args);
    };

    server.provider = provider;

    let connectionManager;
    if (options.ws) {
      connectionManager = webSocketServer(server, provider, logger).connectionManager;
    }

    const oldClose = server.close;
    server.close = function() {
      // gracefully close all websocket connections
      const promises = [];
      if (connectionManager) {
        promises.push.apply(promises, Object.values(connectionManager.connections).map(({ connection }) => {
          return new Promise(resolve => {
            const closeTimer = setTimeout(connection.close.bind(connection), 1000);
            connection.once("close", () => {
              clearTimeout(closeTimer);
              resolve();
            });
            connection.drop(1001);
          });
        }));
      }
      // gracefully close all non-websocket connections
      promises.push.apply(promises, Object.values(connections).map(connection => {
        if (connection.destroyed) {
          return Promise.resolve();
        }
        return new Promise(resolve => {
          const closeTimer = setTimeout(connection.destroy.bind(connection), 1000);
          connection.once("close", () => {
            clearTimeout(closeTimer);
            resolve();
          });
          connection.end();
        });
      }));

      // wait for all connections to close
      Promise.all(promises)
        .catch(e => e)
        .then(() => new Promise(resolve => server.provider.close(resolve)))
        .then(() => {
          var args = Array.prototype.slice.call(arguments);
          oldClose.apply(server, args);
        });
    };
    return server;
  }
};

const defaultOptions = {
  logger: {
    log: function() {}
  },
  ws: true,
  keepAliveTimeout: 5000
};

var _applyDefaultOptions = function(options) {
  return _.merge({}, defaultOptions, options);
};
