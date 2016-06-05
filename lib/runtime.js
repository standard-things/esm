var Entry = require("./entry.js").Entry;

exports.enable = function (Module) {
  var Mp = Module.prototype;

  if (typeof Mp.import === "function" &&
      typeof Mp.export === "function") {
    // If the Mp.{import,export} methods have already been
    // defined, abandon reification immediately.
    return Module;
  }

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
  Mp.runModuleSetters = function runModuleSetters() {
    var entry = Entry.get(this.id);
    if (entry) {
      entry.runModuleSetters(this);
    }
  };

  function setESModule(module) {
    var exports = module.exports;
    if (exports && typeof exports === "object") {
      exports.__esModule = true;
    }
  }

  Mp.import = function (id, setters) {
    var module = this;
    setESModule(module);

    var absoluteId = module.resolve(id);

    if (setters && typeof setters === "object") {
      var entry = Entry.getOrCreate(absoluteId);
      entry.addSetters(module, setters);
    }

    var countBefore = entry && entry.runCount;
    var exports = typeof module.require === "function"
      ? module.require(absoluteId)
      : require(absoluteId);

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
  };

  // Register a getter function for a local variable in the scope of an
  // export statement.
  Mp.export = function (id, getter) {
    var module = this;
    setESModule(module);

    var entry = Entry.getOrCreate(module.id);

    if (typeof id === "string") {
      entry.addGetter(id, getter);
    } else if (typeof id === "object") {
      entry.addGetters(id);
    }

    if (module.loaded) {
      // If the module has already been evaluated, then we need to trigger
      // another round of entry.runModuleSetters calls, which begins by
      // calling entry.runModuleGetters(module).
      entry.runModuleSetters(module);
    } else {
      // If the module has not yet finished evaluating, then we only want
      // to call entry.runModuleGetters(module) to update module.exports.
      entry.runModuleGetters(module);
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
        ! (exports &&
           typeof exports === "object" &&
           exports.__esModule &&
           "default" in exports)) {
      return exports;
    }

    return exports && exports[name];
  };

  return Module;
};
