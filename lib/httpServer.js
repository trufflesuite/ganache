const http = require("http");
const { rpcError } = require("./utils/to");

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

        var headers = {};

        // https://fetch.spec.whatwg.org/#http-requests
        let isCORSRequest = request.headers.hasOwnProperty("origin");
        let isCORSPreflight = isCORSRequest &&
                              method === "OPTIONS" &&
                              request.headers.hasOwnProperty("access-control-request-headers") &&
                              request.headers.hasOwnProperty("access-control-request-method");

        if (isCORSRequest) {
          // From the spec: "It cannot be reliably identified as participating in the CORS protocol
          // as the `Origin` header is also included for all requests whose method is neither
          // `GET` nor `HEAD`."
          headers["Access-Control-Allow-Origin"] = request.headers.origin;

          // Based on https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Credentials,
          // it doesn't look like there will be an HTTP Request header that tells you whether or not to
          // include this. Since web3 now sets Request.withCredentials this header needs to be set.
          // https://github.com/ethereum/web3.js/pull/1722
          headers["Access-Control-Allow-Credentials"] = "true";
        } else {
          // There is no origin so we'll default to wildcard.
          headers["Access-Control-Allow-Origin"] = "*";
        }

        switch (method) {
          // The options request will always be used to handle the preflight request.
          case "OPTIONS":
            if (isCORSPreflight) {
              // Explicitly set the origin instead of using *, since credentials
              // can't be used in conjunction with *. This will always be set
              // for valid preflight requests.
              headers["Access-Control-Allow-Origin"] = request.headers.origin;

              // From the spec: https://fetch.spec.whatwg.org/#http-responses
              // "For a CORS-preflight request, request’s credentials mode is always "omit",
              // but for any subsequent CORS requests it might not be. Support therefore
              // needs to be indicated as part of the HTTP response to the CORS-preflight request as well."
              headers["Access-Control-Allow-Credentials"] = "true";

              headers["Access-Control-Allow-Headers"] = request.headers["access-control-request-headers"];
              headers["Vary"] = "Access-Control-Request-Headers";

              headers["Access-Control-Allow-Methods"] = "POST";

              headers["Content-Length"] = 0;
              response.writeHead(204, headers);
              response.end();
            } else {
              let errorMessage = "OPTIONS preflight request is missing at least on of the required ";
              errorMessage += "fields: Origin, Access-Control-Request-Headers, Access-Control-Request-Method";
              headers["Content-Length"] = errorMessage.length;
              response.writeHead(400, headers);
              response.end(errorMessage);
            }

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

            // http connections do not support subscriptions
            if (payload.method === "eth_subscribe" || payload.method === "eth_unsubscribe") {
              headers["Content-Type"] = "application/json";
              response.writeHead(400, headers);
              response.end(rpcError(payload.id, -32000, "notifications not supported"));
              break;
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
