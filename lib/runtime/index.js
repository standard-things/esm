"use strict";

// This module should be maximally compatible with older JS environments,
// just like the other files in reify/lib/runtime. Node 4+ features like
// let/const and arrow functions are not acceptable here, and importing
// any npm packages should be contemplated with extreme skepticism.

var utils = require("./utils.js");
var Entry = require("./entry.js");

var useToStringTag = typeof Symbol === "function" &&
  typeof Symbol.toStringTag === "symbol";

// The exports.enable method can be used to enable the Reify runtime for
// specific module objects, or for Module.prototype (where implemented),
// to make the runtime available throughout the entire module system.
exports.enable = function (mod) {
  if (typeof mod.export !== "function" ||
      typeof mod.importSync !== "function") {
    mod.export = moduleExport;
    mod.exportDefault = moduleExportDefault;
    mod.import = moduleImport;
    mod.run = moduleRun;
    mod.runSetters = runSetters;
    mod.watch = watch;

    // To be deprecated:
    mod.importSync = importSync;
    mod.runModuleSetters = runSetters;

    return true;
  }

  return false;
};

function moduleRun(wrapperFunc) {
  wrapperFunc();
  this.loaded = true;
  this.runSetters();
}

// If key is provided, it will be used to identify the given setters so
// that they can be replaced if module.importSync is called again with the
// same key. This avoids potential memory leaks from import declarations
// inside loops. The compiler generates these keys automatically (and
// deterministically) when compiling nested import declarations.
function importSync(id, setters, key) {
  return this.watch(this.require(id), setters, key);
}

// Register getter functions for local variables in the scope of an export
// statement. Pass true as the second argument to indicate that the getter
// functions always return the same values.
function moduleExport(getters, constant) {
  utils.setESModule(this.exports);
  var entry = Entry.getOrCreate(this.exports);
  entry.addGetters(getters, constant);
  if (this.loaded) {
    // If the module has already been evaluated, then we need to trigger
    // another round of entry.runSetters calls, which begins by calling
    // entry.runModuleGetters(module).
    entry.runSetters();
  }
}

// Register a getter function that always returns the given value.
function moduleExportDefault(value) {
  return this.export({
    default: function () {
      return value;
    }
  }, true);
}

function moduleImport(id) {
  var that = this;

  return Promise.resolve().then(function() {
    var ns = Object.create(null);
    if (useToStringTag) {
      Object.defineProperty(ns, Symbol.toStringTag, {
        configurable: false,
        enumerable: false,
        value: "Module",
        writable: false
      });
    }

    that.watch(that.require(id), {
      "*": function (value, name) {
        ns[name] = value;
      }
    });

    return ns;
  });
}

// Platform-specific code should find a way to call this method whenever
// the module system is about to return module.exports from require. This
// might happen more than once per module, in case of dependency cycles,
// so we want Module.prototype.runSetters to run each time.
function runSetters(valueToPassThrough) {
  var entry = Entry.get(this.exports);
  if (entry !== null) {
    entry.runSetters();
  }

  // Assignments to exported local variables get wrapped with calls to
  // module.runSetters, so module.runSetters returns the
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
  //   console.log(module.runSetters(a += 3));
  //
  // This ensures module.runSetters runs immediately after the assignment,
  // and does not interfere with the larger computation.
  return valueToPassThrough;
}

function watch(exported, setters, key) {
  utils.setESModule(this.exports);
  if (utils.isObject(setters)) {
    Entry.getOrCreate(exported).addSetters(this, setters, key);
  }
}
