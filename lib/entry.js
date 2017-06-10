"use strict"

const OrderedMap = require("./ordered-map.js")
const utils = require("./utils.js")

const GETTER_ERROR = {}
const NAN = {}
const UNDEFINED = {}

const entryWeakMap = new WeakMap
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
    this.getters = new OrderedMap
    // The object importers receive when using `import * as ns from "..."` syntax.
    this.namespace = createNamespace()
    // A map of the modules this Entry is managing by id.
    this.ownerModules = new OrderedMap
    // Setters for assigning to local variables in parent modules.
    this.setters = new OrderedMap
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
      entry.ownerModules.set(owner.id, owner)
    }

    return entry
  }

  addGetters(getters, constant) {
    let nameCount = getters.length
    constant = !! constant

    while (nameCount--) {
      const pair = getters[nameCount]
      const name = pair[0]
      const getter = pair[1]

      // Should this throw if this.getters[name] exists?
      if (! this.getters.has(name)) {
        this.getters.set(name, getter)
        getter.constant = constant
        getter.runCount = 0
      }
    }
  }

  addSetters(parent, setters) {
    let nameCount = setters.length

    if (! nameCount) {
      return
    }

    while (nameCount--) {
      const pair = setters[nameCount]
      const name = pair[0]
      const setter = pair[1]

      setter.parent = parent
      if (! this.setters.has(name)) {
        this.setters.set(name, Object.create(null))
      }
      this.setters.get(name)[setterCounter++] = setter
    }

    this.runSetters()
  }

  // Called by module.runSetters once the module this Entry is managing has
  // finished loading.
  hasLoaded() {
    if (this._loaded) {
      return true
    }

    const ids = this.ownerModules.keys()
    let idCount = ids.length

    while (idCount--) {
      const owner = this.ownerModules.get(ids[idCount])

      if (! owner.loaded && owner.exports === this.exports) {
        // At least one owner module whose exports are === this.exports has not
        // finished loading, so this this Entry cannot be marked as loaded yet.
        return false
      }
    }
    return this._loaded = true
  }

  runGetters() {
    if (! utils.getESModule(this.exports)) {
      Object.assign(this.namespace, this.exports)
      this.namespace.default = this.exports
      return
    }

    let i = -1
    const names = this.getters.keys()
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
  runSetters() {
    // Make sure module.exports and entry.namespace are up to date before we
    // call getExportByName(entry, name).
    this.runGetters()

    // Lazily-initialized object mapping parent module identifiers to parent
    // module objects whose setters we might need to run.
    const names = this.setters.keys()
    const parents = Object.create(null)
    const parentIDs = []

    forEachSetter(this, names, (setter, value) => {
      const id = setter.parent.id

      if (! (id in parents)) {
        parents[id] = setter.parent
        parentIDs.push(id)
      }

      setter(value)
    })

    // If any of the setters updated the module.exports of a parent module,
    // or updated local variables that are exported by that parent module,
    // then we must re-run any setters registered by that parent module.
    let i = -1
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

function changed(setter, value) {
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
  let i = -1
  const nameCount = names.length

  while (++i < nameCount) {
    const name = names[i]
    const getter = entry.getters.get(name)
    const setters = entry.setters.get(name)
    const value = getExportByName(entry, name)

    // Sometimes a getter function will throw because it's called
    // before the variable it's supposed to return has been
    // initialized, so we need to know that the getter function
    // has run to completion at least once.
    const shouldDelete =
      typeof getter === "function" &&
      getter.runCount > 0 &&
      getter.constant

    let j = -1
    const keys = Object.keys(setters)
    const keyCount = keys.length

    while (++j < keyCount) {
      const key = keys[j]
      const setter = setters[key]

      // Only invoke the callback if we have not called this setter before,
      // or the value is different from the last value passed to this setter.
      if (changed(setter, value)) {
        callback(setter, value)
      }

      if (shouldDelete) {
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

  if (name in entry.namespace) {
    return entry.namespace[name]
  }

  const exported = entry.exports

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
  const getter = entry.getters.get(name)

  try {
    const result = getter()
    ++getter.runCount
    return result
  } catch (e) {}

  return GETTER_ERROR
}

module.exports = Entry
