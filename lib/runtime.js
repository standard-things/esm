"use strict";

var Entry = require("./entry.js");
var utils = require("./utils.js");

exports.enable = function (Module) {
  var Mp = Module.prototype;

  if (typeof Mp.importSync === "function" &&
      typeof Mp.export === "function") {
    // If the Mp.{importSync,export} methods have already been defined,
    // abandon reification immediately.
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
  Mp.runModuleSetters = function runModuleSetters(valueToPassThrough) {
    var entry = Entry.get(this.id);
    if (entry !== null) {
      entry.runModuleSetters(this);
    }

    // Assignments to exported local variables get wrapped with calls to
    // module.runModuleSetters, so module.runModuleSetters returns the
    // valueToPassThrough parameter to allow the value of the original
    // expression to pass through. For example,
    //
    //   export var a = 1;
    //   console.log(a += 3);
    //
    // becomes
    //
    //   module.export("a", () => a);
    //   var a = 1;
    //   console.log(module.runModuleSetters(a += 3));
    //
    // This ensures module.runModuleSetters runs immediately after the
    // assignment, and does not interfere with the larger computation.
    return valueToPassThrough;
  };

  // If key is provided, it will be used to identify the given setters so
  // that they can be replaced if module.importSync is called again with the
  // same key. This avoids potential memory leaks from import declarations
  // inside loops. The compiler generates these keys automatically (and
  // deterministically) when compiling nested import declarations.
  Mp.importSync = function (id, setters, key) {
    utils.setESModule(this.exports);

    var absoluteId = this.resolve(id);

    if (! (typeof setters === "object" && setters !== null)) {
      this.require(absoluteId);
      return;
    }

    var entry = Entry.getOrCreate(absoluteId);
    entry.addSetters(this, setters, key);

    var countBefore = entry.runCount;
    var exports = this.require(absoluteId);

    if (entry.runCount === countBefore) {
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

  // Register getter functions for local variables in the scope of an
  // export statement. The keys of the getters object are exported names,
  // and the values are functions that return local values.
  Mp.export = function (getters) {
    utils.setESModule(this.exports);

    if (typeof getters === "object" && getters !== null) {
      Entry.getOrCreate(this.id).addGetters(getters);
    }

    if (this.loaded) {
      // If the module has already been evaluated, then we need to trigger
      // another round of entry.runModuleSetters calls, which begins by
      // calling entry.runModuleGetters(module).
      this.runModuleSetters();
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
        ! (utils.getESModule(exports) &&
           "default" in exports)) {
      return exports;
    }

    if (exports == null) {
      return;
    }

    return exports[name];
  };

  return Module;
};
