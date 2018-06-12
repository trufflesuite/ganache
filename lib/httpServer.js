var http = require("http");

module.exports = function (provider, options) {
  var server = http.createServer(function (request, response) {
    var logger = options.logger;

    var headers = request.headers;
    var method = request.method;
    var url = request.url;
    var body = [];

    request.on('error', function (err) {
      // console.error(err);
    }).on('data', function (chunk) {
      body.push(chunk);
    }).on('end', function () {
      body = Buffer.concat(body).toString();
      // At this point, we have the headers, method, url and body, and can now
      // do whatever we need to in order to respond to this request.

      var headers = {
        "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*"
      };

      switch (method) {
        case "OPTIONS":
          headers[ "Content-Type" ] = "text/plain"
          response.writeHead(200, headers);
          response.end("");
          break;
        case "POST":
          //console.log("Request coming in:", body);

          var payload;
          try {
            payload = JSON.parse(body);
          } catch (e) {
            headers[ "Content-Type" ] = "text/plain";
            response.writeHead(400, headers);
            response.end("400 Bad Request");
            return;
          }

          // Log messages that come into the TestRPC via http
          var logIfNeed = function (message) {
            if (options.noMethodLog === false) {
              logger.log(message);
            }
          };
          if (payload instanceof Array) {
            // Batch request
            for (var i = 0; i < payload.length; i++) {
              var item = payload[ i ];
              logIfNeed(item.method);
            }
          } else {
            logIfNeed(payload.method);
          }

          provider.send(payload, function (err, result) {
            headers[ "Content-Type" ] = "application/json";
            response.writeHead(200, headers);
            response.end(JSON.stringify(result));
          });

          break;
        default:
          response.writeHead(400, {
            "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Content-Type": "text/plain"
          });
          response.end("400 Bad Request");
          break;
      }
    });
  });

  server.ganacheProvider = provider;
  return server;
};
