"use strict"

const utils = require("./utils.js")

const GETTER_ERROR = {}
const NAN = {}
const UNDEFINED = {}

const entryWeakMap = new WeakMap
const hasOwn = Object.prototype.hasOwnProperty
const useToStringTag = typeof Symbol.toStringTag === "symbol"

let setterCounter = 0

class Entry {
  constructor(exported) {
    // Boolean indicating whether the module this Entry is managing has
    // finished evaluation yet.
    this._loaded = false
    // The module.exports of the module this Entry is managing.
    this.exports = exported
    // Getters for local variables exported from the managed module.
    this.getters = Object.create(null)
    // The object importers receive when using `import * as ns from "..."` syntax.
    this.namespace = createNamespace()
    // A map of the modules this Entry is managing by id.
    this.ownerModules = Object.create(null)
    // Setters for assigning to local variables in parent modules.
    this.setters = Object.create(null)
  }

  static get(exported) {
    const entry = utils.isObjectLike(exported)
      ? entryWeakMap.get(exported)
      : void 0

    return entry === void 0 ? null : entry
  }

  static getOrCreate(exported, owner) {
    let entry

    if (utils.isObjectLike(exported)) {
      entry = entryWeakMap.get(exported)
      if (entry === void 0) {
        entry = new Entry(exported)
        entryWeakMap.set(exported, entry)
      }
    } else {
      // In case the child module modified module.exports, create a temporary
      // Entry object so that we can call the entry.addSetters method once,
      // which will trigger entry.runSetters(names), so that module.importSync
      // behaves as expected.
      entry = new Entry(exported)
    }

    if (utils.isObject(owner)) {
      entry.ownerModules[owner.id] = owner
    }

    return entry
  }

  addGetters(getters, constant) {
    let i = -1
    const names = Object.keys(getters)
    const nameCount = names.length
    constant = !! constant

    while (++i < nameCount) {
      const name = names[i]
      const getter = getters[name]

      if (typeof getter === "function" &&
          // Should this throw if this.getters[name] exists?
          ! (name in this.getters)) {
        this.getters[name] = getter
        getter.constant = constant
        getter.runCount = 0
      }
    }
  }

  addSetters(parent, setters) {
    const names = Object.keys(setters)
    let nameCount = names.length

    if (! nameCount) {
      return
    }

    while (nameCount--) {
      const name = names[nameCount]
      const setter = setters[name]

      if (typeof setter === "function") {
        setter.parent = parent
        if (! (name in this.setters)) {
          this.setters[name] = Object.create(null)
        }
        this.setters[name][setterCounter++] = setter
      }
    }

    this.runSetters(names)
  }

  // Called by module.runSetters once the module this Entry is managing has
  // finished loading.
  hasLoaded() {
    if (this._loaded) {
      return true
    }

    const ids = Object.keys(this.ownerModules)
    let idCount = ids.length

    while (idCount--) {
      const owner = this.ownerModules[ids[idCount]]
      if (! owner.loaded && owner.exports === this.exports) {
        // At least one owner module whose exports are === this.exports has not
        // finished loading, so this this Entry cannot be marked as loaded yet.
        return false
      }
    }
    return this._loaded = true
  }

  runGetters(names) {
    if (! utils.getESModule(this.exports)) {
      Object.assign(this.namespace, this.exports)
      this.namespace.default = this.exports
      return
    }

    if (names === void 0 || names.indexOf("*") > -1) {
      names = Object.keys(this.getters)
    }

    let i = -1
    const nameCount = names.length

    while (++i < nameCount) {
      const name = names[i]
      let value = runGetter(this, name)

      // If the getter is run without error, update module.exports and
      // module.namespace with the current value so that CommonJS require calls
      // remain consistent with module.watch.
      if (value === GETTER_ERROR) {
        value = void 0
      }

      if (! this._loaded || name in this.namespace) {
        this.exports[name] =
        this.namespace[name] = value
      }
    }
  }

  // Called whenever module.exports might have changed to trigger any setters
  // associated with the newly exported values. The names parameter is optional
  // without it, all getters and setters will run.
  runSetters(names) {
    // Make sure module.exports and entry.namespace are up to date before we
    // call getExportByName(entry, name).
    this.runGetters(names)

    // Lazily-initialized object mapping parent module identifiers to parent
    // module objects whose setters we might need to run.
    let parents

    forEachSetter(this, names, (setter, value) => {
      if (parents === void 0) {
        parents = Object.create(null)
      }
      parents[setter.parent.id] = setter.parent
      setter(value)
    })

    if (! parents) {
      return
    }

    // If any of the setters updated the module.exports of a parent module,
    // or updated local variables that are exported by that parent module,
    // then we must re-run any setters registered by that parent module.
    let i = -1
    const parentIDs = Object.keys(parents)
    const parentIDCount = parentIDs.length

    while (++i < parentIDCount) {
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
}

Object.setPrototypeOf(Entry.prototype, null)

function callSetterIfNecessary(setter, name, value, callback) {
  // Only invoke the callback if we have not called this setter
  // (with a value of this name) before, or the current value is
  // different from the last value we passed to this setter.
  let shouldCall = false

  if (name === "*") {
    const keys = Object.keys(value)
    let keyCount = keys.length

    while (keyCount--) {
      const key = keys[keyCount]
      if (changed(setter, key, value[key])) {
        shouldCall = true
      }
    }
  } else if (changed(setter, name, value)) {
    shouldCall = true
  }

  if (shouldCall) {
    callback(setter, value)
  }
}

function changed(setter, name, value) {
  let valueToCompare = value

  if (valueToCompare !== valueToCompare) {
    valueToCompare = NAN
  } else if (valueToCompare === void 0) {
    valueToCompare = UNDEFINED
  }

  if (setter.last === valueToCompare) {
    return false
  }

  setter.last = valueToCompare
  return true
}

// Invoke the given callback once for every (setter, name, value) that needs to
// be called. Note that forEachSetter does not call any setters itself, only the
// given callback.
function forEachSetter(entry, names, callback) {
  if (names === void 0) {
    names = Object.keys(entry.setters)
  }

  let i = -1
  const nameCount = names.length

  while (++i < nameCount) {
    const name = names[i]
    const setters = entry.setters[name]
    const keys = Object.keys(setters)

    let j = -1
    const keyCount = keys.length

    while (++j < keyCount) {
      const key = keys[j]
      const value = getExportByName(entry, name)

      callSetterIfNecessary(setters[key], name, value, callback)

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
  return ns
}

function runGetter(entry, name) {
  const getter = entry.getters[name]

  if (typeof getter === "function") {
    try {
      const result = getter()
      ++getter.runCount
      return result
    } catch (e) {}
  }
  return GETTER_ERROR
}

module.exports = Entry
