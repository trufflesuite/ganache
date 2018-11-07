var util = require("util");
var AbstractLevelDOWN = require("abstract-leveldown").AbstractLevelDOWN;
var async = require("async");
var fs = require("fs");
var path = require("path");

util.inherits(FileDown, AbstractLevelDOWN);

function FileDown(location) {
  this.location = location;
  AbstractLevelDOWN.call(this, location);
}

FileDown.prototype._open = function(options, callback) {
  var self = this;
  callback(null, self);
};

FileDown.prototype._put = function(key, value, options, callback) {
  fs.writeFile(path.join(this.location, key), value, "utf8", callback);
};

FileDown.prototype._get = function(key, options, callback) {
  fs.readFile(path.join(this.location, key), "utf8", function(err, data) {
    if (err) {
      return callback(new Error("NotFound"));
    }
    callback(null, data);
  });
};

FileDown.prototype._del = function(key, options, callback) {
  fs.unlink(path.join(this.location, key), function(err) {
    // Ignore when we try to delete a file that doesn't exist.
    // I'm not sure why this happens. Worth looking into.
    if (err) {
      if (err.message.indexOf("ENOENT") >= 0) {
        return callback();
      } else {
        return callback(err);
      }
    }
    callback();
  });
};

FileDown.prototype._batch = function(array, options, callback) {
  var self = this;
  async.each(
    array,
    function(item, finished) {
      if (item.type === "put") {
        self.put(item.key, item.value, options, finished);
      } else if (item.type === "del") {
        self.del(item.key, options, finished);
      } else {
        finished(new Error("Unknown batch type", item.type));
      }
    },
    function(err) {
      if (err) {
        return callback(err);
      }
      callback();
    }
  );
};

module.exports = function(location) {
  return new FileDown(location);
};
