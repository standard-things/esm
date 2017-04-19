"use strict";

var GETTER_ERROR = {};
var NAN = {};
var UNDEFINED = {};

var entryMap = Object.create(null);
var keySalt = 0;

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

Ep.addSetters = function (parent, setters, key) {
  var names = Object.keys(setters);
  var nameCount = names.length;

  if (! nameCount) {
    return;
  }

  // If no key is provided, make a unique key. Otherwise, make sure the key is
  // distinct from keys provided by other parent modules.
  key = typeof key === "undefined"
    ? makeUniqueKey()
    : parent.id + ":" + key;

  for (var i = 0; i < nameCount; ++i) {
    var name = names[i];
    var setter = setters[name];
    if (typeof setter === "function" &&
        // Ignore any requests for the exports.__esModule property.
        name !== "__esModule") {
      setter.parent = parent;
      (this.setters[name] =
        this.setters[name] || Object.create(null)
      )[key] = setter;
    }
  }
};

Ep.addGetters = function (getters) {
  var names = Object.keys(getters);
  var nameCount = names.length;

  for (var i = 0; i < nameCount; ++i) {
    var name = names[i];
    var getter = getters[name];
    if (typeof getter === "function" &&
        // Ignore any requests for the exports.__esModule property.
        name !== "__esModule" &&
        // Should this throw if this.getters[name] exists?
        ! this.getters[name]) {
      this.getters[name] = getter;
    }
  }
};

Ep.runModuleGetters = function (module) {
  var names = Object.keys(this.getters);
  var nameCount = names.length;

  for (var i = 0; i < nameCount; ++i) {
    var name = names[i];
    var value = runGetter(this, name);

    // If the getter is run without error, update module.exports[name] with
    // the current value so that CommonJS require calls remain consistent with
    // module.importSync.
    if (value !== GETTER_ERROR) {
      module.exports[name] = value;
    }
  }
};

// Called whenever module.exports might have changed, to trigger any
// setters associated with the newly exported values.
Ep.runModuleSetters = function (module) {
  // Make sure module.exports is up to date before we call
  // module.getExportByName(name).
  this.runModuleGetters(module);

  // Lazily-initialized object mapping parent module identifiers to parent
  // module objects whose setters we might need to run.
  var parents;

  // Take snapshots of setter.parent.exports for any setters that we are
  // planning to call, so that we can later determine if calling the
  // setters modified any of those exports objects.
  forEachSetter(module, this, function (setter, name, value) {
    parents = parents || Object.create(null);
    parents[setter.parent.id] = setter.parent;

    // The param order for setters is `value` then `name` because the `name`
    // param is only used by namespace exports.
    setter(value, name);
  });

  ++this.runCount;

  if (! parents) {
    return;
  }

  // If any of the setters updated the module.exports of a parent module,
  // or updated local variables that are exported by that parent module,
  // then we must re-run any setters registered by that parent module.
  var parentIDs = Object.keys(parents);
  var parentIDCount = parentIDs.length;

  for (var i = 0; i < parentIDCount; ++i) {
    // What happens if parents[parentIDs[id]] === module, or if
    // longer cycles exist in the parent chain? Thanks to our setter.last
    // bookkeeping above, the runModuleSetters broadcast will only proceed
    // as far as there are any actual changes to report.
    var parent = parents[parentIDs[i]];
    var entry = entryMap[parent.id];
    if (entry) {
      entry.runModuleSetters(parent);
    }
  }
};

function call(setter, name, value, callback) {
  if (name === "__esModule") {
    // Ignore setters asking for module.exports.__esModule.
    return;
  }

  var valueToCompare = value;
  if (valueToCompare !== valueToCompare) {
    valueToCompare = NAN;
  } else if (typeof valueToCompare === "undefined") {
    valueToCompare = UNDEFINED;
  }

  setter.last = setter.last || Object.create(null);

  if (setter.last[name] !== valueToCompare) {
    // Only invoke the callback if we have not called this setter
    // (with a value of this name) before, or the current value is
    // different from the last value we passed to this setter.
    setter.last[name] = valueToCompare;
    return callback(setter, name, value);
  }
}

// Invoke the given callback once for every (setter, value, name) triple
// that needs to be called. Note that forEachSetter does not call any
// setters itself, only the given callback.
function forEachSetter(module, entry, callback) {
  var names = Object.keys(entry.setters);
  var nameCount = names.length;

  for (var i = 0; i < nameCount; ++i) {
    var name = names[i];
    var setters = entry.setters[name];
    var keys = Object.keys(setters);
    var keyCount = keys.length;

    for (var j = 0; j < keyCount; ++j) {
      var key = keys[j];
      var value = module.getExportByName(name);

      if (name === "*") {
        var valueNames = Object.keys(value);
        var valueNameCount = valueNames.length;

        for (var k = 0; k < valueNameCount; ++k) {
          var valueName = valueNames[k];
          call(setters[key], valueName, value[valueName], callback);
        }

      } else {
        call(setters[key], name, value, callback);
      }
    }
  }
}

function makeUniqueKey() {
  return Math.random()
    .toString(36)
    // Add an incrementing salt to help track key ordering and also
    // absolutely guarantee we never return the same key twice.
    .replace("0.", ++keySalt + ":");
}

function runGetter(entry, name) {
  try {
    return entry.getters[name]();
  } catch (e) {}
  return GETTER_ERROR;
}

module.exports = Entry;
