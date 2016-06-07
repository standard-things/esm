var hasOwn = Object.prototype.hasOwnProperty;
var entryMap = Object.create(null);
var utils = require("./utils.js");

function Entry(id) {
  // Same as module.id for this module.
  this.id = id;
  // The number of times this.runModuleSetters has been called.
  this.runCount = 0;
  // Map from parent module identifiers to parent module objects.
  this.parents = Object.create(null);
  // Setters for assigning to local variables in parent modules.
  this.setters = Object.create(null);
  // Getters for local variables exported from this module.
  this.getters = Object.create(null);
}

var Ep = Entry.prototype;

Entry.get = function (id) {
  return entryMap[id] || null;
};

Entry.getOrCreate = function (id) {
  return entryMap[id] = entryMap[id] || new Entry(id);
};

Ep.addSetters = function (parent, setters) {
  var entry = this;

  // Register the parent module so we can call runParentSetters later.
  entry.parents[parent.id] = parent;

  Object.keys(setters).forEach(function (name) {
    var setter = setters[name];
    if (typeof setter === "function" &&
        // Ignore any requests for the exports.__esModule property."
        name !== "__esModule") {
      (entry.setters[name] =
       entry.setters[name] || []
      ).push(setter);
    }
  });
};

Ep.addGetters = function (getters) {
  var entry = this;
  Object.keys(getters).forEach(function (name) {
    var getter = getters[name];
    if (typeof getter === "function" &&
        // Ignore any requests for the exports.__esModule property."
        name !== "__esModule") {
      // Should this throw if hasOwn.call(this.getters, name)?
      entry.getters[name] = getter;
    }
  });
};

function runModuleSetters(module) {
  var entry = entryMap[module.id];
  if (entry) {
    entry.runModuleSetters(module);
  }
}

function runModuleGetters(module) {
  var entry = entryMap[module.id];
  return entry ? entry.runModuleGetters(module) : 0;
}

Ep.runModuleGetters = function (module) {
  var entry = this;
  var changeCount = 0;

  Object.keys(entry.getters).forEach(function (name) {
    if (entry.runGetter(module, name)) {
      ++changeCount;
    }
  });

  return changeCount;
};

// Returns true iff the getter updated module.exports with a new value.
Ep.runGetter = function (module, name) {
  if (! hasOwn.call(this.getters, name)) {
    return false;
  }

  var getter = this.getters[name];
  var value = getter.call(module);
  var exports = module.exports;

  if (! hasOwn.call(exports, name) ||
      exports[name] !== value) {
    // We update module.exports[name] with the current value so that
    // CommonJS require calls remain consistent with module.import.
    exports[name] = value;
    return true;
  }

  return false;
};

Ep.runModuleSetters = function (module) {
  var entry = this;
  var parents = this.parents;
  var snapshots = Object.create(null);

  Object.keys(parents).forEach(function (id) {
    var parent = parents[id];
    var exports = parent.exports;
    if (utils.isPlainObject(exports)) {
      // If parent.exports is an object, make a shallow clone of it so
      // that we can see if it changes as a result of calling setters.
      snapshots[id] = utils.assign({}, exports);
    } else {
      // If parent.exports is not an object, the "snapshot" is just the
      // value of parent.exports.
      snapshots[id] = exports;
    }
  });

  // Make sure module.exports is up to date before we call
  // module.getExportByName(name).
  entry.runModuleGetters(module);

  Object.keys(entry.setters).forEach(function (name) {
    var value = module.getExportByName(name);

    entry.setters[name].forEach(function (setter) {
      if (name === "*") {
        Object.keys(value).forEach(function (name) {
          if (name !== "__esModule") {
            callSetter(module, setter, name, value[name]);
          }
        });
      } else {
        callSetter(module, setter, name, value);
      }
    });
  });

  ++entry.runCount;

  // If any of the setters updated the module.exports of a parent module,
  // or updated local variables that are exported by that parent module,
  // then we must re-run any setters registered by that parent module.
  Object.keys(parents).forEach(function (id) {
    var parent = parents[id];

    if (runModuleGetters(parent) > 0) {
      return runModuleSetters(parent);
    }

    var exports = parent.exports;
    var snapshot = snapshots[parent.id];
    if (utils.shallowObjEqual(exports, snapshot)) {
      return;
    }

    runModuleSetters(parent);
  });
};

function callSetter(module, setter, name, value) {
  setter.last = setter.last || Object.create(null);
  if (! hasOwn.call(setter.last, name) ||
      value !== setter.last[name]) {
    return setter.call(
      module,
      setter.last[name] = value,
      name
    );
  }
}

exports.Entry = Entry;
