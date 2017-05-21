"use strict";

const utils = require("./utils.js");

const Runtime = require("../lib/runtime");
const Rp = Runtime.prototype;

const moduleImport = Rp.import;
const moduleImportSync = Rp.importSync;

Rp.import = function (id) {
  return moduleImport.call(this, utils.resolvePath(id, this));
};

Rp.importSync = function (id, setters, key) {
  return moduleImportSync.call(this, utils.resolvePath(id, this), setters, key);
};

module.exports = Runtime;
