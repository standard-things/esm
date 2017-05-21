"use strict";

const utils = require("./utils.js");

const Runtime = require("../lib/runtime");
const Rp = Runtime.prototype;
const rpImport = Rp.import;
const rpImportSync = Rp.importSync;

function moduleImport(id) {
  return rpImport.call(this, utils.resolvePath(id, this));
}

Rp.import = moduleImport;

function moduleImportSync(id, setters, key) {
  return rpImportSync.call(this, utils.resolvePath(id, this), setters, key);
}

Rp.importSync = moduleImportSync;

module.exports = Runtime;
