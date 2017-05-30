"use strict"

const utils = require("./utils.js")

const GETTER_ERROR = {}
const NAN = {}
const UNDEFINED = {}

const entryWeakMap = new WeakMap;
const hasOwn = Object.prototype.hasOwnProperty
const useToStringTag = typeof Symbol.toStringTag === "symbol"

let keySalt = 0

function Entry(exported, owner) {
  // The module.exports of the module this Entry is managing.
  this.exports = exported
  // Getters for local variables exported from the managed module.
  this.getters = Object.create(null)
  // Boolean indicating whether the module this Entry is managing has
  // finished evaluation yet.
  this.loaded = false
  // The object importers receive when using `import * as ns from "..."` syntax.
  this.namespace = createNamespace()
  // The module object this Entry is managing.
  this.owner = utils.isObject(owner) ? owner : null
  // Setters for assigning to local variables in parent modules.
  this.setters = Object.create(null)
}

const Ep = Object.setPrototypeOf(Entry.prototype, null)

function get(exported) {
  const entry = utils.isObjectLike(exported)
    ? entryWeakMap.get(exported)
    : void 0

  return entry === void 0 ? null : entry
}

Entry.get = get

function getOrCreate(exported, owner) {
  if (! utils.isObjectLike(exported)) {
    // In case the child module modified module.exports, create a temporary
    // Entry object so that we can call the entry.addSetters method once,
    // which will trigger entry.runSetters(names), so that module.importSync
    // behaves as expected.
    return new Entry(exported, owner)
  }

  let entry = entryWeakMap.get(exported);
  if (entry === void 0) {
    entry = new Entry(exported, owner)
    entryWeakMap.set(exported, entry)
  }
  return entry
}

Entry.getOrCreate = getOrCreate

function addGetters(getters, constant) {
  const names = Object.keys(getters)
  const nameCount = names.length
  constant = !! constant

  for (let i = 0; i < nameCount; ++i) {
    const name = names[i]
    const getter = getters[name]

    if (typeof getter === "function" &&
        // Ignore any requests for the exports.__esModule property.
        name !== "__esModule" &&
        // Should this throw if this.getters[name] exists?
        ! (name in this.getters)) {
      this.getters[name] = getter
      getter.constant = constant
      getter.runCount = 0
    }
  }
}

Ep.addGetters = addGetters

function addSetters(parent, setters, key, namespaces) {
  const names = Object.keys(setters)
  const nameCount = names.length

  if (! nameCount) {
    return
  }

  // If no key is provided, make a unique key. Otherwise, make sure the key is
  // distinct from keys provided by other parent modules.
  key = key === void 0
    ? makeUniqueKey()
    : parent.id + ":" + key

  for (let i = 0; i < nameCount; ++i) {
    const name = names[i]
    const setter = setters[name]

    if (typeof setter === "function" &&
        // Ignore any requests for the exports.__esModule property.
        name !== "__esModule") {
      setter.parent = parent
      if (! (name in this.setters)) {
        this.setters[name] = Object.create(null)
      }
      this.setters[name][key] = setter
    }
  }

  this.runSetters(names)
}

Ep.addSetters = addSetters

function runGetters(names) {
  if (names === void 0) {
    names = Object.keys(this.getters)
  }

  const nameCount = names.length

  for (let i = 0; i < nameCount; ++i) {
    const name = names[i]
    const value = runGetter(this, name)

    // If the getter is run without error, update module.exports and
    // module.namespace with the current value so that CommonJS require calls
    // remain consistent with module.watch.
    if (value !== GETTER_ERROR) {
      this.exports[name] =
      this.namespace[name] = value
    }
  }
}

Ep.runGetters = runGetters

// Called whenever module.exports might have changed to trigger any setters
// associated with the newly exported values. The names parameter is optional
// without it, all getters and setters will run.
function runSetters(names) {
  // Make sure module.exports and entry.namespace are up to date before we call
  // getExportByName(entry, name).
  this.runGetters()

  // Lazily-initialized object mapping parent module identifiers to parent
  // module objects whose setters we might need to run.
  let parents

  forEachSetter(this, names, (setter, name, value) => {
    if (parents === void 0) {
      parents = Object.create(null)
    }
    parents[setter.parent.id] = setter.parent

    // The param order for setters is `value` then `name` because the `name`
    // param is only used by namespace exports.
    setter(value, name)
  })

  if (! parents) {
    return
  }

  // If any of the setters updated the module.exports of a parent module,
  // or updated local variables that are exported by that parent module,
  // then we must re-run any setters registered by that parent module.
  const parentIDs = Object.keys(parents)
  const parentIDCount = parentIDs.length

  for (let i = 0; i < parentIDCount; ++i) {
    // What happens if parents[parentIDs[id]] === module, or if
    // longer cycles exist in the parent chain? Thanks to our setter.last
    // bookkeeping in call(), the runSetters broadcast will only proceed
    // as far as there are any actual changes to report.
    const parent = parents[parentIDs[i]]
    const parentEntry = Entry.get(parent.exports)
    if (parentEntry) {
      parentEntry.runSetters()
    }
  }
}

Ep.runSetters = runSetters

function call(setter, name, value, callback) {
  if (name === "__esModule") {
    // Ignore setters asking for module.exports.__esModule.
    return
  }

  let valueToCompare = value
  if (valueToCompare !== valueToCompare) {
    valueToCompare = NAN
  } else if (valueToCompare === void 0) {
    valueToCompare = UNDEFINED
  }

  if (setter.last === void 0) {
    setter.last = Object.create(null)
  }

  if (setter.last[name] !== valueToCompare) {
    // Only invoke the callback if we have not called this setter
    // (with a value of this name) before, or the current value is
    // different from the last value we passed to this setter.
    setter.last[name] = valueToCompare
    return callback(setter, name, value)
  }
}

// Invoke the given callback once for every (setter, name, value) that needs to
// be called. Note that forEachSetter does not call any setters itself, only the
// given callback.
function forEachSetter(entry, names, callback) {
  if (names === void 0) {
    names = Object.keys(entry.setters)
  }

  const nameCount = names.length

  for (let i = 0; i < nameCount; ++i) {
    const name = names[i]
    const setters = entry.setters[name]
    const keys = Object.keys(setters)
    const keyCount = keys.length

    for (let j = 0; j < keyCount; ++j) {
      const key = keys[j]
      const value = getExportByName(entry, name)

      if (name === "*") {
        const valueNames = Object.keys(value)
        const valueNameCount = valueNames.length

        for (let k = 0; k < valueNameCount; ++k) {
          const valueName = valueNames[k]
          call(setters[key], valueName, value[valueName], callback)
        }

      } else {
        call(setters[key], name, value, callback)

        const getter = entry.getters[name]
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
          delete setters[key]
        }
      }
    }
  }
}

function getExportByName(entry, name) {
  if (name === "*") {
    return entry.namespace
  }

  if (hasOwn.call(entry.namespace, name)) {
    return entry.namespace[name]
  }

  const  exported = entry.exports

  if (name === "default" &&
      ! (utils.getESModule(exported) &&
         "default" in exported)) {
    return exported
  }

  if (exported == null) {
    return
  }

  return exported[name]
}

function createNamespace() {
  const ns = Object.create(null)
  if (useToStringTag) {
    Object.defineProperty(ns, Symbol.toStringTag, {
      value: "Module",
      configurable: false,
      enumerable: false,
      writable: false
    })
  }
  return ns;
}

function makeUniqueKey() {
  return Math.random()
    .toString(36)
    // Add an incrementing salt to help track key ordering and also
    // absolutely guarantee we never return the same key twice.
    .replace("0.", ++keySalt + "$")
}

function runGetter(entry, name) {
  const getter = entry.getters[name]
  try {
    const result = getter()
    ++getter.runCount
    return result
  } catch (e) {}
  return GETTER_ERROR
}

module.exports = Entry
