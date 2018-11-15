var http = require("http");

module.exports = function(provider, logger) {
  var server = http.createServer(function(request, response) {
    var method = request.method;
    var body = [];

    request
      .on("data", function(chunk) {
        body.push(chunk);
      })
      .on("end", function() {
        body = Buffer.concat(body).toString();
        // At this point, we have the headers, method, url and body, and can now
        // do whatever we need to in order to respond to this request.

        var headers = {
          "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, User-Agent",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "*"
        };

        if (request.headers.hasOwnProperty("access-control-request-headers")) {
          headers["Access-Control-Allow-Headers"] = request.headers["access-control-request-headers"];
        }

        switch (method) {
          case "OPTIONS":
            headers["Content-Type"] = "text/plain";
            response.writeHead(200, headers);
            response.end("");
            break;
          case "POST":
            // console.log("Request coming in:", body);

            var payload;
            try {
              payload = JSON.parse(body);
            } catch (e) {
              headers["Content-Type"] = "text/plain";
              response.writeHead(400, headers);
              response.end("400 Bad Request");
              return;
            }

            // Log messages that come into the TestRPC via http
            if (payload instanceof Array) {
              // Batch request
              for (var i = 0; i < payload.length; i++) {
                var item = payload[i];
                logger.log(item.method);
              }
            } else {
              logger.log(payload.method);
            }

            provider.send(payload, function(_, result) {
              headers["Content-Type"] = "application/json";
              response.writeHead(200, headers);
              response.end(JSON.stringify(result));
            });

            break;
          default:
            headers["Content-Type"] = "text/plain";
            response.writeHead(400, headers);
            response.end("400 Bad Request");
            break;
        }
      });
  });

  server.ganacheProvider = provider;
  return server;
};
