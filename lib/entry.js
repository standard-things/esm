"use strict";

var utils = require("./utils.js");
var FastObject = utils.FastObject;

var GETTER_ERROR = {};
var NAN = {};
var UNDEFINED = {};

var entryMap = new FastObject;
var keySalt = 0;

function Entry(id) {
  // Same as module.id for this module.
  this.id = id;
  // The number of times this.runModuleSetters has been called.
  this.runCount = 0;
  // Setters for assigning to local variables in parent modules.
  this.setters = new FastObject;
  // Getters for local variables exported from this module.
  this.getters = new FastObject;
}

var Ep = Entry.prototype;

Entry.get = function (id) {
  return id in entryMap ? entryMap[id] : null;
};

Entry.getOrCreate = function (id) {
  if (id in entryMap) {
    return entryMap[id];
  }
  return entryMap[id] = new Entry(id);
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
        ! (name in this.getters)) {
      this.getters[name] = getter;
    }
  }
};

Ep.addSetters = function (parent, setters, key) {
  var names = Object.keys(setters);
  var nameCount = names.length;

  if (! nameCount) {
    return;
  }

  // If no key is provided, make a unique key. Otherwise, make sure the key is
  // distinct from keys provided by other parent modules.
  key = key === void 0
    ? makeUniqueKey()
    : parent.id + ":" + key;

  for (var i = 0; i < nameCount; ++i) {
    var name = names[i];
    var setter = setters[name];

    if (typeof setter === "function" &&
        // Ignore any requests for the exports.__esModule property.
        name !== "__esModule") {
      setter.parent = parent;
      if (! (name in this.setters)) {
        this.setters[name] = new FastObject;
      }
      this.setters[name][key] = setter;
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
  // getExportByName(module.exports, name).
  this.runModuleGetters(module);

  // Lazily-initialized object mapping parent module identifiers to parent
  // module objects whose setters we might need to run.
  var parents;

  forEachSetter(module, this, function (setter, name, value) {
    if (parents === void 0) {
      parents = Object.create(null);
    }
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
    var id = parent.id;
    if (id in entryMap) {
      entryMap[id].runModuleSetters(parent);
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
  } else if (valueToCompare === void 0) {
    valueToCompare = UNDEFINED;
  }

  if (setter.last === void 0) {
    setter.last = Object.create(null);
  }

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
      var value = getExportByName(module.exports, name);

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

function getExportByName(exports, name) {
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
