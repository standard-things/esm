"use strict";

// This module should be compatible with PhantomJS v1, just like the other files
// in reify/lib/runtime. Node 4+ features like const/let and arrow functions are
// not acceptable here, and importing any npm packages should be contemplated
// with extreme skepticism.

var utils = require("./utils.js");
var Entry = require("./entry.js");

function Runtime() {}
var Rp = utils.setPrototypeOf(Runtime.prototype, null);

// The exports.enable method can be used to enable the Reify runtime for
// specific module objects, or for Module.prototype (where implemented),
// to make the runtime available throughout the entire module system.
function enable(mod) {
  if (typeof mod.export !== "function" ||
      typeof mod.import !== "function") {
    var proto = this.prototype;
    for (var key in proto) {
      mod[key] = proto[key];
    }
    return true;
  }

  return false;
}

Runtime.enable = enable;

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
    // entry.runGetters(module).
    entry.runSetters();
  }
}

Rp.export = moduleExport;

// Register a getter function that always returns the given value.
function moduleExportDefault(value) {
  return this.export({
    default: function () {
      return value;
    }
  }, true);
}

Rp.exportDefault = moduleExportDefault;

function moduleImport(id) {
  var that = this;

  return Promise.resolve().then(function () {
    var ns = Object.create(null);

    that.watch(that.require(id), {
      "*": function (value, name) {
        ns[name] = value;
      }
    }, void 0, [ns]);

    return ns;
  });
}

Rp.import = moduleImport;

// If key is provided, it will be used to identify the given setters so
// that they can be replaced if module.importSync is called again with the
// same key. This avoids potential memory leaks from import declarations
// inside loops. The compiler generates these keys automatically (and
// deterministically) when compiling nested import declarations.
function moduleImportSync(id, setters, key, namespaces) {
  return this.watch(this.require(id), setters, key, namespaces);
}

Rp.importSync = moduleImportSync;

function run(wrapper) {
  wrapper();
  this.loaded = true;
  this.runSetters();
}

Rp.run = run;

// Platform-specific code should find a way to call this method whenever
// the module system is about to return module.exports from require. This
// might happen more than once per module, in case of dependency cycles,
// so we want Module.prototype.runSetters to run each time.
function runSetters(valueToPassThrough) {
  var entry = Entry.get(this.exports);
  if (entry !== null) {
    // If there's not already an Entry object for this module, then there
    // won't be any setters to run.
    entry.runSetters();
  }

  if (this.loaded) {
    // If this module has already loaded, then we have to create an Entry
    // object here, so that we can call entry.onLoaded(), which sets
    // entry.loaded true for any future modules that might want to import
    // from this module. If we don't create the Entry now, we'll never
    // have another chance to call entry.onLoaded().
    if (entry === null) {
      entry = Entry.getOrCreate(this.exports);
    }

    entry.onLoaded();
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

Rp.runSetters =
Rp.runModuleSetters = runSetters;

function watch(exported, setters, key, namespaces) {
  utils.setESModule(this.exports);

  if (utils.isObject(setters)) {
    Entry.getOrCreate(exported)
      .addSetters(this, setters, key, namespaces);
  }
}

Rp.watch = watch;

function finishNs(ns) {
  return Object.seal(ns);
}

module.exports = Runtime;

