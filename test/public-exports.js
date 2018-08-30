var Ganache = require(process.env.TEST_BUILD ? "../build/ganache.core." + process.env.TEST_BUILD + ".js" : "../index.js");
var assert = require("assert");

// Thanks solc. At least this works!
// This removes solc's overzealous uncaughtException event handler.
process.removeAllListeners("uncaughtException");

describe("Mining", function() {
    it("Tests the right version", () =>{
        assert(process.env.TEST_BUILD ? Ganache._webpacked === true : Ganache._webpacked === false);
    });
});