// Generated by CoffeeScript 1.12.3
var Readable, Scanner, Table, util, utils;

util = require('util');

utils = require('./utils');

Table = require('./table');

Readable = require('stream').Readable;

Scanner = function(client, options) {
  this.options = options != null ? options : {};
  this.options.objectMode = true;
  Readable.call(this, this.options);
  this.client = client;
  if (typeof this.options === 'string') {
    this.options = {
      table: this.options
    };
  }
  if (!this.options.table) {
    throw Error('Missing required option "table"');
  }
  this.options.id = null;
  return this.callback = null;
};

util.inherits(Scanner, Readable);

Scanner.prototype.init = function(callback) {
  var encode, encoding, key, params;
  params = {};
  if (params.batch == null) {
    params.batch = 1000;
  }
  key = "/" + this.options.table + "/scanner";
  encoding = this.options.encoding === 'undefined' ? this.options.encoding : this.client.options.encoding;
  if (this.options.startRow) {
    params.startRow = utils.base64.encode(this.options.startRow, encoding);
  }
  if (this.options.endRow) {
    params.endRow = utils.base64.encode(this.options.endRow, encoding);
  }
  if (this.options.startTime) {
    params.startTime = this.options.startTime;
  }
  if (this.options.endTime) {
    params.endTime = this.options.endTime;
  }
  if (this.options.maxVersions) {
    params.maxVersions = this.options.maxVersions;
  }
  if (this.options.column) {
    params.column = [];
    if (typeof this.options.column === 'string') {
      this.options.column = [this.options.column];
    }
    this.options.column.forEach(function(column, i) {
      return params.column[i] = utils.base64.encode(column, encoding);
    });
  }
  if (this.options.filter) {
    encode = function(obj) {
      var k, results;
      results = [];
      for (k in obj) {
        if (k === 'value' && (!obj['type'] || obj['type'] !== 'RegexStringComparator' && obj['type'] !== 'PageFilter')) {
          results.push(obj[k] = utils.base64.encode(obj[k], encoding));
        } else {
          if (typeof obj[k] === 'object') {
            results.push(encode(obj[k]));
          } else {
            results.push(void 0);
          }
        }
      }
      return results;
    };
    encode(this.options.filter);
    params.filter = JSON.stringify(this.options.filter);
  }
  return this.client.connection.put(key, params, (function(_this) {
    return function(err, data, response) {
      var id;
      if (err) {
        return callback(err);
      }
      id = /scanner\/(\w+)$/.exec(response.headers.location)[1];
      _this.options.id = id;
      return callback(null, id);
    };
  })(this));
};

Scanner.prototype.get = function(callback) {
  var key;
  key = "/" + this.table + "/scanner/" + this.options.id;
  return this.client.connection.get(key, (function(_this) {
    return function(err, data, response) {
      var cells;
      if (response && response.statusCode === 204) {
        return callback();
      }
      if (err) {
        return callback(err);
      }
      cells = [];
      data.Row.forEach(function(row) {
        key = utils.base64.decode(row.key, _this.client.options.encoding);
        return row.Cell.forEach(function(cell) {
          data = {};
          data.key = key;
          data.column = utils.base64.decode(cell.column, _this.client.options.encoding);
          data.timestamp = cell.timestamp;
          data.$ = utils.base64.decode(cell.$, _this.client.options.encoding);
          return cells.push(data);
        });
      });
      return callback(null, cells);
    };
  })(this));
};

Scanner.prototype["delete"] = function(callback) {
  return this.client.connection["delete"]("/" + this.table + "/scanner/" + this.options.id, callback);
};

Scanner.prototype._read = function(size) {
  if (this.done) {
    return;
  }
  if (!this.options.id) {
    return this.init((function(_this) {
      return function(err, id) {
        if (err) {
          return _this.emit('error', err);
        }
        return _this._read();
      };
    })(this));
  }
  return this.get((function(_this) {
    return function(err, cells) {
      var cell, j, len, results;
      if (_this.done) {
        return;
      }
      if (err) {
        return _this.emit('error', err);
      }
      if (!cells) {
        _this.done = true;
        return _this["delete"](function(err) {
          if (err) {
            return _this.emit('error', err);
          }
          return _this.push(null);
        });
      }
      results = [];
      for (j = 0, len = cells.length; j < len; j++) {
        cell = cells[j];
        results.push(_this.push(cell));
      }
      return results;
    };
  })(this));
};

module.exports = Scanner;
