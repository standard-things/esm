var Module = require("module");
var Entry = require("./entry.js").Entry;
var Mp = Module.prototype;
var load = Mp.load;

Mp.import = function (id, setters) {
  var module = this;

  id = Module._resolveFilename(id, module);

  if (setters && typeof setters === "object") {
    var entry = Entry.getOrCreate(id);
    entry.addSetters(setters);
    entry.addParent(module);
  }

  var countBefore = entry && entry.runCount;
  var exports = module.require(id);

  if (entry && entry.runCount === countBefore) {
    entry.runModuleSetters(Module._cache[id] || {
      id: id,
      exports: exports,
      getExportByName: Mp.getExportByName
    });
  }

  return exports;
};

// Override Module.prototype.load to call Entry.runModuleSetters whenever
// a module has loaded.
Mp.load = function () {
  var result = load.apply(this, arguments);
  Entry.runModuleSetters(this);
  return result;
};

// This method can be overridden by client code to implement custom export
// naming logic. The current implementation works well with Babel's
// __esModule convention.
Mp.getExportByName = function (name) {
  var exports = this.exports;

  if (name === "*") {
    return exports;
  }

  if (name === "default" &&
      ! (exports && exports.__esModule)) {
    return exports;
  }

  return exports && exports[name];
};
