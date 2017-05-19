"use strict";

const runtime = require("../lib/runtime");
const utils = require("./utils.js");

exports.enable = function (mod) {
  if (runtime.enable(mod)) {
    mod.import = wrapImport(mod.import);
    mod.importSync = wrapImportSync(mod.importSync);
    return true;
  }

  return false;
};

function wrapImport(func) {
  return function (id) {
    return func.call(this, utils.resolvePath(id, this));
  };
}

function wrapImportSync(func) {
  return function (id, setters, key) {
    return func.call(this, utils.resolvePath(id, this), setters, key);
  };
}
