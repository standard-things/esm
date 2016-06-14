var hasOwn = Object.prototype.hasOwnProperty;
var entryMap = Object.create(null);
var utils = require("./utils.js");

function Entry(id) {
  // Same as module.id for this module.
  this.id = id;
  // The number of times this.runModuleSetters has been called.
  this.runCount = 0;
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

  Object.keys(setters).forEach(function (name) {
    var setter = setters[name];
    if (typeof setter === "function" &&
        // Ignore any requests for the exports.__esModule property."
        name !== "__esModule") {
      setter.parent = parent;
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
  try {
    var value = getter.call(module);
  } catch (e) {}
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

// Called whenever module.exports might have changed, to trigger any
// setters associated with the newly exported values.
Ep.runModuleSetters = function (module) {
  var entry = this;
  var names = Object.keys(entry.setters);

  // Make sure module.exports is up to date before we call
  // module.getExportByName(name).
  entry.runModuleGetters(module);

  // Invoke the given callback once for every (setter, value, name) triple
  // that needs to be called. Note that forEachSetter does not call any
  // setters itself, only the given callback.
  function forEachSetter(callback, context) {
    names.forEach(function (name) {
      entry.setters[name].forEach(function (setter) {
        var value = module.getExportByName(name);
        if (name === "*") {
          Object.keys(value).forEach(function (name) {
            call(setter, value[name], name);
          });
        } else {
          call(setter, value, name);
        }
      });
    });

    function call(setter, value, name) {
      if (name === "__esModule") {
        // Ignore setters asking for module.exports.__esModule.
        return;
      }

      setter.last = setter.last || Object.create(null);

      if (! hasOwn.call(setter.last, name) ||
          setter.last[name] !== value) {
        // Only invoke the callback if we have not called this setter
        // (with a value of this name) before, or the current value is
        // different from the last value we passed to this setter.
        return callback.apply(context, arguments);
      }
    }
  }

  // Every three elements of this list form a (setter, value, name) triple
  // that needs to be invoked.
  var settersToCall = [];

  // Lazily-initialized objects mapping parent module identifiers to
  // relevant parent module objects and snapshots of their exports.
  var relevantParents;
  var parentSnapshots;

  // Take snapshots of setter.parent.exports for any setters that we are
  // planning to call, so that we can later determine if calling the
  // setters modified any of those exports objects.
  forEachSetter(function (setter, value, name) {
    var parent = setter.parent;
    parentSnapshots = parentSnapshots || Object.create(null);
    if (! hasOwn.call(parentSnapshots, parent.id)) {
      relevantParents = relevantParents || Object.create(null);
      relevantParents[parent.id] = parent;
      if (utils.isPlainObject(parent.exports)) {
        // If parent.exports is an object, make a shallow clone of it so
        // that we can see if it changes as a result of calling setters.
        parentSnapshots[parent.id] = utils.assign({}, parent.exports);
      } else {
        // If parent.exports is not an object, the "snapshot" is just the
        // value of parent.exports.
        parentSnapshots[parent.id] = parent.exports;
      }
    }

    // Push three elements at a time to avoid creating wrapper arrays for
    // each (setter, value, name) triple. Note the i += 3 below.
    settersToCall.push(setter, value, name);
  });

  // Now call all the setters that we decided we need to call.
  for (var i = 0; i < settersToCall.length; i += 3) {
    var setter = settersToCall[i];
    var value = settersToCall[i + 1];
    var name = settersToCall[i + 2];
    setter.call(module, setter.last[name] = value, name);
  }

  ++entry.runCount;

  if (! relevantParents) {
    // If we never called takeSnapshot, then we can avoid checking
    // relevantParents and parentSnapshots below.
    return;
  }

  // If any of the setters updated the module.exports of a parent module,
  // or updated local variables that are exported by that parent module,
  // then we must re-run any setters registered by that parent module.
  Object.keys(relevantParents).forEach(function (id) {
    var parent = relevantParents[id];

    if (runModuleGetters(parent) > 0) {
      return runModuleSetters(parent);
    }

    var exports = parent.exports;
    var snapshot = parentSnapshots[parent.id];
    if (utils.shallowObjEqual(exports, snapshot)) {
      // If parent.exports have not changed since we took the snapshot,
      // then we do not need to run the parent's setters.
      return;
    }

    runModuleSetters(parent);
  });
};

exports.Entry = Entry;
