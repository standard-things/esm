var assert = require("assert");
var Module = require("module");
var Mp = Module.prototype;

if (typeof Mp.import === "function" &&
    typeof Mp.export === "function") {
  // If the Module.prototype.{import,export} methods are already defined,
  // abandon reification immediately.
  return;
}

// Enable import and export statements in the default Node REPL.
require("./repl");

var Entry = require("./entry.js").Entry;
var compile = require("./compiler.js").compile;

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

// Override Module.prototype.load to call Entry.runModuleSetters whenever
// a module has loaded.
var load = Mp.load;
Mp.load = function () {
  var result = load.apply(this, arguments);
  Entry.runModuleSetters(this);
  return result;
};

// Override Module.prototype._compile to compile any code that will be
// evaluated as a module.
// TODO Does this work in the Node REPL?
var _compile = Mp._compile;
Mp._compile = function (content, filename) {
  return _compile.call(this, compile(content), filename);
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
