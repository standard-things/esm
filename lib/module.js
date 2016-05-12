var Module = exports.Module = module.constructor;
var Mp = Module.prototype;

if (typeof Mp.import === "function" &&
    typeof Mp.export === "function") {
  // If the Mp.{import,export} methods have already been
  // defined, abandon reification immediately.
  return;
}

var Entry = require("./entry.js").Entry;

// Platform-specific code should implement this method however
// appropriate. Module.prototype.resolve(id) should return an absolute
// version of the given module identifier, like require.resolve.
Mp.resolve = Mp.resolve || function resolve(id) {
  throw new Error("Module.prototype.resolve not implemented");
};

// Platform-specific code should find a way to call this method whenever
// the module system is about to return module.exports from require. This
// might happen more than once per module, in case of dependency cycles,
// so we want Module.prototype.runModuleSetters to run each time.
Mp.runModuleSetters = function runModuleSetters(id) {
  var entry = Entry.get(this.id);
  if (entry) {
    entry.runModuleSetters(this);
  }
};

Mp.import = function (id, setters) {
  var module = this;
  var absoluteId = module.resolve(id);

  if (setters && typeof setters === "object") {
    var entry = Entry.getOrCreate(absoluteId);
    entry.addSetters(setters);
    entry.addParent(module);
  }

  var countBefore = entry && entry.runCount;
  var exports = require(absoluteId);

  if (entry && entry.runCount === countBefore) {
    // If require(absoluteId) didn't run any setters for this entry,
    // perhaps because it's not the first time this module has been
    // required, run the setters now using an object that passes as the
    // real module object.
    entry.runModuleSetters({
      id: absoluteId,
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

  // Call module.export() with no arguments if you just want to trigger
  // another round of entry.runModuleSetters. See issue #12.
  entry.runModuleSetters(this);
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
