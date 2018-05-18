var inherits = require("util").inherits;
var to = require("./to");

inherits(RuntimeError, Error);

// Note: ethereumjs-vm will return an object that has a "results" and "receipts" keys.
// You should pass in the whole object.
function RuntimeError(transactions, vm_output) {

  // Why not just Error.apply(this, [message])? See
  // https://gist.github.com/justmoon/15511f92e5216fa2624b#anti-patterns
  Error.captureStackTrace(this, this.constructor)
  this.name = this.constructor.name;

  this.results = {};
  this.hashes = [];

  // handles creating this.message
  this.combine(transactions, vm_output);
};

RuntimeError.prototype.combine = function(transactions, vm_output) {
  // Can be combined with vm_output or another RuntimeError.
  if (transactions instanceof RuntimeError) {
    var err = transactions;
    var keys = Object.keys(err.results);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      this.results[key] = err.results[key];
      Array.prototype.push.apply(this.hashes, err.hashes);
    }
  } else {
    var results = vm_output.results;

    for (var i = 0; i < transactions.length; i++) {
      var tx = transactions[i];
      var result = results[i];

      // 1 means no error, oddly.
      if (result.vm.exception != 1) {
        var hash = to.hex(tx.hash());

        this.hashes.push(hash);

        this.results[hash] = {
          error: result.vm.exceptionError.error || result.vm.exceptionError,
          program_counter: result.vm.runState.programCounter,
          return: to.hex(result.vm.return)
        };
      }
    }
  }

  // Once combined, set the message
  if (this.hashes.length == 1) {
    this.message = "VM Exception while processing transaction: " + this.results[this.hashes[0]].error;
  } else {
    this.message = "Multiple VM Exceptions while processing transactions: \n\n";

    for (var i = 0; i < this.hashes.length; i++) {
      var hash = this.hashes[i];

      this.message += hash + ": " + this.results[hash].error + "\n";
    }
  }
};

RuntimeError.prototype.count = function() {
  return Object.keys(this.results).length;
};

RuntimeError.fromResults = function(transactions, vm_output) {
  var err = new RuntimeError(transactions, vm_output);

  if (err.count() == 0) {
    return null;
  }

  return err;
};

module.exports = RuntimeError;
