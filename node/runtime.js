"use strict";

const utils = require("./utils.js");

const LibRuntime = require("../lib/runtime");
const Lp = LibRuntime.prototype;

class Runtime extends LibRuntime {
  static enable(mod) {
    return super.enable.call(this, mod);
  }
}

const Rp = Runtime.prototype;

Rp.import = function (id) {
  return Lp.import.call(this, utils.resolvePath(id, this));
};

Rp.importSync = function (id, setters, key) {
  return Lp.importSync.call(this, utils.resolvePath(id, this), setters, key);
};

module.exports = Runtime;
