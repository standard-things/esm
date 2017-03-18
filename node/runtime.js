var dynRequire = module.require ? module.require.bind(module) : __non_webpack_require__;
var Module = require("../lib/runtime.js").enable(dynRequire('module'));
var Mp = Module.prototype;

exports.Module = Module;

// Define Module.prototype.resolve in a way that makes sense for Node.
Mp.resolve = function (id) {
  return Module._resolveFilename(id, this);
};

// Override Module.prototype.load to call this.runModuleSetters() whenever
// a module has loaded.
var load = Mp.load;
if (! load.reified && Mp.runModuleSetters) {
  (Mp.load = function () {
    var result = load.apply(this, arguments);
    this.runModuleSetters();
    return result;
  }).reified = load;
}
