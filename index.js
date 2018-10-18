"use strict";
exports.__esModule = true;
var provider_1 = require("./src/provider");
var server_1 = require("./src/server");
// `server` and `provider` are here for backwards compatability
exports["default"] = {
    server: function (options) { return new server_1["default"](options); },
    provider: function (options) { return new provider_1["default"](options); },
    Server: server_1["default"],
    Provider: provider_1["default"]
};
