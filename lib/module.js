var Module = module.constructor;
var Mp = Module.prototype;

if (typeof Mp.import === "function" &&
    typeof Mp.export === "function") {
  // If the Module.prototype.{import,export} methods are already defined,
  // abandon reification immediately.
  return;
}

var Entry = require("./entry.js").Entry;

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

// Register a getter function for a local variable in the scope of an
// export statement.
Mp.export = function (id, getter) {
  var entry = Entry.getOrCreate(this.id);
  if (typeof id === "string") {
    entry.addGetter(id, getter);
  } else if (typeof id === "object") {
    entry.addGetters(id);
  }
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
