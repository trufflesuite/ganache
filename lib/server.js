// make sourcemaps work!
require("source-map-support/register");

var Provider = require("./provider");
var webSocketServer = require("./webSocketServer");
var httpServer = require("./httpServer");
var _ = require("lodash");

module.exports = {
  create: function(options) {
    options = _applyDefaultOptions(options || {});
    let server;

    if (options.flavor === "tezos") {
      const flextesa = require("./tezos/flextesa");
      server = {
        listen: (port, host, _backlog, callback) => {
          // just trying to match node's server.listen signature here :-/
          if (typeof port === "object") {
            options.port = port.port || options.port;
            options.host = port.host || options.host;
            if (host) {
              if (typeof host === "function") {
                callback = host;
              } else if (typeof _backlog === "function") {
                callback = _backlog;
              }
            }
          } else if (typeof port === "number" || typeof port === "string") {
            options.port = parseInt(port || options.port, 10);
            if (typeof host === "string") {
              options.host = host || options.host;
              if (typeof _backlog === "function") {
                callback = _backlog;
              }
            } else if (typeof host === "function") {
              callback = host;
            }
          } else {
            throw new Error("`server.start` called with unsupported method signature.");
          }

          callback = callback || (() => {});

          flextesa
            .start(options)
            .then((flextesa) => {
              server.provider = flextesa;
              callback(null, flextesa);
            })
            .catch(callback);
        },
        close: (fn) => {
          flextesa.close(fn);
        }
      };
    } else {
      var logger = options.logger;
      var provider = new Provider(options);

      server = httpServer(provider, logger);
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

      if (options.ws) {
        webSocketServer(server, provider, logger);
      }

      var oldClose = server.close;

      server.close = function(callback) {
        var args = Array.prototype.slice.call(arguments);
        oldClose.apply(server, args);

        server.provider.close(function(err) {
          if (err) {
            return callback(err);
          }
          Object.keys(connections).forEach((key) => {
            try {
              connections[key].destroy();
            } catch (error) {}
          });
        });
      };
    }

    return server;
  }
};

const defaultOptions = {
  flavor: "ethereum",
  logger: {
    log: function() {}
  },
  ws: true,
  keepAliveTimeout: 5000
};

var _applyDefaultOptions = function(options) {
  return _.merge({}, defaultOptions, options);
};
