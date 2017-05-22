"use strict";

// This module should be compatible with PhantomJS v1, just like the other files
// in reify/lib/runtime. Node 4+ features like const/let and arrow functions are
// not acceptable here, and importing any npm packages should be contemplated
// with extreme skepticism.

var utils = require("./utils.js");

var GETTER_ERROR = {};
var NAN = {};
var UNDEFINED = {};

var useSymbol = typeof Symbol === "function";
var useToStringTag = useSymbol && typeof Symbol.toStringTag === "symbol";

var entryStrKey = "__reifyEntry";
var entrySymKey = useSymbol ? Symbol.for(entryStrKey) : null;
var entryKey = useSymbol ? entrySymKey : entryStrKey;

var hasOwn = Object.prototype.hasOwnProperty;
var keySalt = 0;

function Entry(exported, owner) {
  // The module.exports of the module this Entry is managing.
  this.exports = exported;
  // The module object this Entry is managing, if known.
  this.owner = owner || null;
  // Getters for local variables exported from the managed module.
  this.getters = Object.create(null);
  // Namespace objects created in the managed module.
  this.nsObjects = [];
  // Setters for assigning to local variables in parent modules.
  this.setters = Object.create(null);
  // Boolean indicating whether the module this Entry is managing has
  // finished evaluation yet.
  this.loaded = false;
}

var Ep = utils.setPrototypeOf(Entry.prototype, null);

function get(exported) {
  if (utils.isObjectLike(exported) &&
      hasOwn.call(exported, entryKey)) {
    return exported[entryKey];
  }
  return null;
}

Entry.get = get;

function getOrCreate(exported, owner) {
  if (! utils.isObjectLike(exported)) {
    // In case the child module modified module.exports, create a temporary
    // Entry object so that we can call the entry.addSetters method once,
    // which will trigger entry.runSetters(names), so that module.importSync
    // behaves as expected.
    return new Entry(exported, owner);
  }

  if (hasOwn.call(exported, entryKey)) {
    return exported[entryKey];
  }

  var entry = new Entry(exported, owner);

  if (useSymbol) {
    exported[entryKey] = entry;
  } else {
    Object.defineProperty(exported, entryKey, {
      configurable: true,
      enumerable: false,
      value: entry,
      writable: false
    });
  }

  return entry;
}

Entry.getOrCreate = getOrCreate;

function addGetters(getters, constant) {
  var names = Object.keys(getters);
  var nameCount = names.length;
  constant = !! constant;

  for (var i = 0; i < nameCount; ++i) {
    var name = names[i];
    var getter = getters[name];

    if (typeof getter === "function" &&
        // Ignore any requests for the exports.__esModule property.
        name !== "__esModule" &&
        // Should this throw if this.getters[name] exists?
        ! (name in this.getters)) {
      this.getters[name] = getter;
      getter.constant = constant;
      getter.runCount = 0;
    }
  }
}

Ep.addGetters = addGetters;

function addNamespace(ns) {
  if (useToStringTag) {
    Object.defineProperty(ns, Symbol.toStringTag, {
      value: "Module",
      configurable: false,
      enumerable: false,
      writable: false
    });
  }

  if (this.loaded) {
    Object.seal(ns);
  } else {
    this.nsObjects.push(ns);
  }
}

Ep.addNamespace = addNamespace;

function addSetters(parent, setters, key, namespaces) {
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
        this.setters[name] = Object.create(null);
      }
      this.setters[name][key] = setter;
    }
  }

  this.runSetters(names);

  if (Array.isArray(namespaces)) {
    // If any namespace objects were provided, remember them so that we
    // can call Object.seal(namespace) later, when the module this Entry
    // is managing has finished loading.
    var nsCount = namespaces.length;
    for (var i = 0; i < nsCount; ++i) {
      this.addNamespace(namespaces[i]);
    }
  }
}

Ep.addSetters = addSetters;

function runGetters(names) {
  var needToCheckNames = true;
  if (typeof names === "undefined") {
    names = Object.keys(this.getters);
    needToCheckNames = false;
  }

  var nameCount = names.length;

  for (var i = 0; i < nameCount; ++i) {
    var name = names[i];

    if (needToCheckNames &&
        ! hasOwn.call(this.getters, name)) {
      continue;
    }

    var value = runGetter(this, name);

    // If the getter is run without error, update module.exports[name] with
    // the current value so that CommonJS require calls remain consistent with
    // module.importSync.
    if (value !== GETTER_ERROR) {
      this.exports[name] = value;
    }
  }
}

Ep.runGetters = runGetters;

// Called whenever module.exports might have changed to trigger any setters
// associated with the newly exported values. The names parameter is optional;
// without it, all getters and setters will run.
function runSetters(names) {
  // Make sure module.exports is up to date before we call
  // getExportByName(module.exports, name).
  this.runGetters(names);

  // Lazily-initialized object mapping parent module identifiers to parent
  // module objects whose setters we might need to run.
  var parents;

  forEachSetter(this, names, function (setter, name, value) {
    if (parents === void 0) {
      parents = Object.create(null);
    }
    parents[setter.parent.id] = setter.parent;

    // The param order for setters is `value` then `name` because the `name`
    // param is only used by namespace exports.
    setter(value, name);
  });

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
    // bookkeeping in call(), the runSetters broadcast will only proceed
    // as far as there are any actual changes to report.
    var parent = parents[parentIDs[i]];
    var parentEntry = Entry.get(parent.exports);
    if (parentEntry) {
      parentEntry.runSetters();
    }
  }
}

Ep.runSetters = runSetters;

// Called by module.runSetters once the module this Entry is managing has
// finished loading.
Ep.onLoaded = function () {
  if (! this.loaded) {
    this.loaded = true;
    this.nsObjects.forEach(Object.seal);
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

// Invoke the given callback once for every (setter, name, value) that needs to
// be called. Note that forEachSetter does not call any setters itself, only the
// given callback.
function forEachSetter(entry, names, callback) {
  var needToCheckNames = true;

  if (names === void 0) {
    names = Object.keys(entry.setters);
    needToCheckNames = false;
  }

  var nameCount = names.length;

  for (var i = 0; i < nameCount; ++i) {
    var name = names[i];

    if (needToCheckNames &&
        ! hasOwn.call(entry.setters, name)) {
      continue;
    }

    var setters = entry.setters[name];
    var keys = Object.keys(setters);
    var keyCount = keys.length;

    for (var j = 0; j < keyCount; ++j) {
      var key = keys[j];
      var value = getExportByName(entry.exports, name);

      if (name === "*") {
        var valueNames = Object.keys(value);
        var valueNameCount = valueNames.length;

        for (var k = 0; k < valueNameCount; ++k) {
          var valueName = valueNames[k];
          call(setters[key], valueName, value[valueName], callback);
        }

      } else {
        call(setters[key], name, value, callback);

        var getter = entry.getters[name];
        if (typeof getter === "function" &&
            // Sometimes a getter function will throw because it's called
            // before the variable it's supposed to return has been
            // initialized, so we need to know that the getter function
            // has run to completion at least once.
            getter.runCount > 0 &&
            getter.constant) {
          // If we happen to know that this getter function has run
          // successfully, and will never return a different value, then
          // we can forget the corresponding setter, because we've already
          // reported that constant value. Note that we can't forget the
          // getter, because we need to remember the original value in
          // case anyone tampers with entry.exports[name].
          delete setters[key];
        }
      }
    }
  }
}

function getExportByName(exported, name) {
  if (name === "*") {
    return exported;
  }

  if (name === "default" &&
      ! (utils.getESModule(exported) &&
         "default" in exported)) {
    return exported;
  }

  if (exported == null) {
    return;
  }

  return exported[name];
}

function makeUniqueKey() {
  return Math.random()
    .toString(36)
    // Add an incrementing salt to help track key ordering and also
    // absolutely guarantee we never return the same key twice.
    .replace("0.", ++keySalt + "$");
}

function runGetter(entry, name) {
  var getter = entry.getters[name];
  try {
    var result = getter();
    ++getter.runCount;
    return result;
  } catch (e) {}
  return GETTER_ERROR;
}

module.exports = Entry;
