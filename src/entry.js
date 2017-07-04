import OrderedMap from "./ordered-map.js"
import utils from "./utils.js"

const GETTER_ERROR = {}
const NAN = {}
const UNDEFINED = {}

const entryWeakMap = new WeakMap
const useToStringTag = typeof Symbol.toStringTag === "symbol"

class Entry {
  constructor(exported) {
    // A number indicating the loading state of the module this Entry is managing.
    this._loaded = 0
    // The child entries of this Entry.
    this.children = new OrderedMap
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
      // Create a temporary Entry object to call entry.addSetters() and trigger
      // entry.runSetters(), so that watch() behaves as expected.
      entry = new Entry(exported)
    }

    if (utils.isObject(owner)) {
      entry.ownerModules.set(owner.id, owner)
    }

    return entry
  }

  addGetters(getterPairs, constant) {
    constant = !! constant

    let i = -1
    const pairCount = getterPairs.length

    while (++i < pairCount) {
      const pair = getterPairs[i]
      const name = pair[0]
      const getter = pair[1]

      // Should this throw if this.getters[name] exists?
      if (! this.getters.has(name)) {
        getter.constant = constant
        getter.runCount = 0
        this.getters.set(name, getter)
      }
    }

    return this
  }

  addSetters(setterPairs, parent) {
    let i = -1
    const pairCount = setterPairs.length

    while (++i < pairCount) {
      const pair = setterPairs[i]
      const name = pair[0]
      const setter = pair[1]
      let setters = this.setters.get(name)

      if (setters === void 0) {
        setters = []
        this.setters.set(name, setters)
      }
      setter.last = Object.create(null)
      setter.parent = parent
      setters.push(setter)
    }

    return this
  }

  // Called by runSetters() once the module this Entry is managing has
  // finished loading.
  loaded() {
    if (this._loaded) {
      return this._loaded
    }

    this._loaded = -1

    let i = -1
    const owners = this.ownerModules.values()
    const ownerCount = owners.length

    // Multiple modules can share the same Entry object because they share
    // the same module.exports object, e.g. when a "bridge" module sets
    // module.exports = require(...) to make itself roughly synonymous
    // with some other module. Just because the bridge module has finished
    // loading (as far as it's concerned), that doesn't mean it should
    // control the loading state of the (possibly shared) Entry.
    while (++i < ownerCount) {
      if (! owners[i].loaded) {
        // At least one owner module has not finished loading, so this Entry
        // cannot be marked as loaded yet.
        return this._loaded = 0
      }
    }

    i = -1
    const children = this.children.values()
    const childrenCount = children.length

    while (++i < childrenCount) {
      if (! children[i].loaded()) {
        return this._loaded = 0
      }
    }

    Object.seal(this.namespace)
    return this._loaded = 1
  }

  runGetters() {
    assignExportsToNamespace(this)

    if (! utils.isESModule(this.exports)) {
      return
    }

    let i = -1
    const getters = this.getters.values()
    const names = this.getters.keys()
    const nameCount = names.length

    while (++i < nameCount) {
      const value = runGetter(getters[i])

      // Update entry.exports and entry.namespace so that CommonJS require
      // calls remain consistent with watch().
      if (value !== GETTER_ERROR) {
        const name = names[i]
        this.exports[name] =
        this.namespace[name] = value
      }
    }

    return this
  }

  // Called whenever exports might have changed to trigger any setters associated
  // with the newly exported values. The names parameter is optional without it,
  // all getters and setters will run.
  runSetters() {
    // Lazily-initialized mapping of parent module identifiers to parent
    // module objects whose setters we might need to run.
    const parentsMap = new OrderedMap

    forEachSetter(this, (setter, value) => {
      parentsMap.set(setter.parent.id, setter.parent)
      setter(value)
    })

    // If any of the setters updated the module.exports of a parent module,
    // or updated local variables that are exported by that parent module,
    // then we must re-run any setters registered by that parent module.
    let i = -1
    const parents = parentsMap.values()
    const parentCount = parents.length

    while (++i < parentCount) {
      // What happens if parents[parentIDs[id]] === module, or if
      // longer cycles exist in the parent chain? Thanks to our setter.last
      // bookkeeping in changed(), the runSetters() broadcast will only proceed
      // as far as there are any actual changes to report.
      const parent = parents[i]
      const parentEntry = Entry.get(parent.exports)

      if (parentEntry) {
        parentEntry.runSetters()
      }
    }

    return this
  }
}

function assignExportsToNamespace(entry) {
  const exported = entry.exports
  const namespace = entry.namespace

  if (utils.isESModule(exported)) {
    for (const key in exported) {
      namespace[key] = exported[key]
    }
    return
  }

  const isESM = utils.isESModuleLike(exported)

  // Add a "default" namespace property unless it's a Babel-like exports,
  // in which case the exported object should be namespace-like and safe to
  // assign directly.
  if (! isESM) {
    namespace.default = exported
  }

  if (! utils.isObjectLike(exported)) {
    return
  }

  let i = -1
  const keys = Object.keys(exported)
  const keyCount = keys.length

  while (++i < keyCount) {
    const key = keys[i]

    if (isESM) {
      namespace[key] = exported[key]
      continue
    } else if (key === "default") {
      continue
    }

    const getter = utils.getGetter(exported, key)
    const setter = utils.getSetter(exported, key)
    const hasGetter = typeof getter === "function"
    const hasSetter = typeof setter === "function"

    if (hasGetter || hasSetter) {
      if (hasGetter) {
        utils.setGetter(namespace, key, getter)
      }
      if (hasSetter) {
        utils.setSetter(namespace, key, setter)
      }
    } else if (entry._loaded < 1 || key in namespace) {
      namespace[key] = exported[key]
    }
  }
}

function callSetterOnChange(entry, setter, name, value, callback) {
  // Only invoke the callback if we have not called this setter
  // (with a value of this name) before, or the current value is
  // different from the last value we passed to this setter.
  let shouldCall = false

  if (name === "*") {
    const isESM = utils.isESModuleLike(entry.exported)

    let i = -1
    const keys = Object.keys(value)
    const keyCount = keys.length

    while (++i < keyCount) {
      const key = keys[i]
      const nsValue = isESM
        ? value[key]
        : utils.getGetter(value, key) || value[key]

      if (changed(setter, key, nsValue)) {
        shouldCall = true
      }
    }
  }

  if (changed(setter, name, value)) {
    shouldCall = true
  }

  if (shouldCall) {
    callback(setter, value)
  }
}

function changed(setter, key, value) {
  let valueToCompare = value

  if (valueToCompare !== valueToCompare) {
    valueToCompare = NAN
  } else if (valueToCompare === void 0) {
    valueToCompare = UNDEFINED
  }

  if (setter.last[key] === valueToCompare) {
    return false
  }

  setter.last[key] = valueToCompare
  return true
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

// Invoke the given callback for every setter that needs to be called.
// Note forEachSetter does not call setters directly, only the given callback.
function forEachSetter(entry, callback) {
  // Make sure entry.exports and entry.namespace are up to date before we
  // call getExportByName().
  entry.runGetters()

  let i = -1
  const collections = entry.setters.values()
  const names = entry.setters.keys()
  const nameCount = names.length

  while (++i < nameCount) {
    const setters = collections[i]
    const setterCount = setters.length

    if (! setterCount) {
      continue
    }

    let j = -1
    const name = names[i]
    const value = getExportByName(entry, name)

    while (++j < setterCount) {
      // Only invoke the callback if we have not called this setter before,
      // or the value is different from the last value passed to this setter.
      callSetterOnChange(entry, setters[j], name, value, callback)
    }

    // Sometimes a getter function will throw because it's called
    // before the variable it's supposed to return has been
    // initialized, so we need to know that the getter function
    // has run to completion at least once.
    const getter = entry.getters.get(name)
    if (typeof getter === "function" &&
        getter.runCount > 0 &&
        getter.constant) {
      // If we happen to know that this getter function has run
      // successfully, and will never return a different value, then
      // we can forget the corresponding setter, because we've already
      // reported that constant value. Note that we can't forget the
      // getter, because we need to remember the original value in
      // case anyone tampers with entry.exports[name].
      setters.length = 0
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

  if (exported == null) {
    return
  }

  return exported[name]
}

function runGetter(getter) {
  try {
    const result = getter()
    ++getter.runCount
    return result
  } catch (e) {}

  return GETTER_ERROR
}

Object.setPrototypeOf(Entry.prototype, null)

export default Entry
