var Provider = require("./provider");
var webSocketServer = require("./webSocketServer");
var httpServer = require("./httpServer");

module.exports = {
  create: function(options) {
    if (options == null) {
      options = {};
    }

    if (options.logger == null) {
      options.logger = {
        log: function() {}
      };
    }

    var logger = options.logger;
    var provider = new Provider(options);

    if (options.ws) {
      var server = webSocketServer(provider, logger);
    } else {
      var server = httpServer(provider, logger);
    }

    connectionCounter = 0;
    connections = {};
    server.on('connection', conn => {
      let key = connectionCounter++;
      connections[key] = conn;
      conn.on('close', () => delete connections[key])
    });

    var oldListen = server.listen;

    server.listen = function() {
      var args = Array.prototype.slice.call(arguments);
      var callback = function() {};
      if (args.length > 0) {
        var last = args[args.length - 1];
        if (typeof last == "function") {
          callback = args.pop();
        }
      }

      var intermediary = function(err) {
        if (err) return callback(err);
        server.provider.manager.waitForInitialization(callback);
      };

      args.push(intermediary);

      oldListen.apply(server, args);
    }

    server.provider = provider;

    var oldClose = server.close;

    server.close = function(callback) {
      var args = Array.prototype.slice.call(arguments);

      oldClose.apply(server, args);

      server.provider.close(function(err) {
        if (err) return callback(err);
        Object.keys(connections).forEach(key => {
          try {
            connections[key].destroy();
          } catch (error) {}
        })
      });
    };

    return server;
  }
};
