"use strict";

const dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;
const Module = require("../lib/runtime.js").enable(dynRequire('module'));
const Mp = Module.prototype;

exports.Module = Module;

// Define Module.prototype.resolve in a way that makes sense for Node.
Mp.resolve = function (id) {
  return Module._resolveFilename(id, this);
};

// Override Module.prototype.load to call this.runModuleSetters() whenever
// a module has loaded.
const load = Mp.load;
if (! load.reified && Mp.runModuleSetters) {
  (Mp.load = function () {
    const result = load.apply(this, arguments);
    this.runModuleSetters();
    return result;
  }).reified = load;
}
