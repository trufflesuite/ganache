#!/usr/bin/env node
var TestRPC = require("../");
var Web3 = require("web3");
var async = require("async");

var server = TestRPC.server();
var port = 12345;
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:" + port));

function runTest(times, fn, callback) {
  var start = new Date();

  async.timesSeries(times, fn, function(err) {
    if (err) {
      return callback(err);
    }

    var end = new Date();
    var actualTime = end.getTime() - start.getTime();

    callback(null, actualTime);
  });
}

function runAverage(title, numberOfRuns, fnTimes, fn, callback) {
  var results = new Array(numberOfRuns);

  async.timesSeries(
    numberOfRuns,
    function(n, next) {
      process.stdout.write(title + " " + (n + 1) + "...");

      runTest(fnTimes, fn, function(err, totalTime) {
        if (err) {
          return next(err);
        }
        results[n] = totalTime;

        console.log(totalTime / 1000 + " seconds");
        next();
      });
    },
    function(err) {
      if (err) {
        return callback(err);
      }

      var sum = results.reduce(function(a, b) {
        return a + b;
      }, 0);

      var average = sum / numberOfRuns;

      console.log("Average " + average / 1000 + " seconds");

      callback(null, average);
    }
  );
}

function bailIfError(_) {
  if (_) {
    process.exit(1);
  }
}

server.listen(port, function(err) {
  bailIfError(err);

  web3.eth.getAccounts(function(err, accounts) {
    bailIfError(err);

    runAverage(
      "Running transactions test",
      4,
      1000,
      function(n, cb) {
        web3.eth.sendTransaction(
          {
            from: accounts[0],
            to: accounts[1],
            value: 500, // wei
            gas: 90000
          },
          cb
        );
      },
      function(err) {
        bailIfError(err);
        server.close();
      }
    );
  });
});
