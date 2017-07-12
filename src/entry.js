import FastObject from "./fast-object.js"
import OrderedMap from "./ordered-map.js"
import utils from "./utils.js"

const GETTER_ERROR = {}
const NAN = {}
const UNDEFINED = {}

const entryWeakMap = new WeakMap
const useToStringTag = typeof Symbol.toStringTag === "symbol"

class Entry {
  constructor(exported) {
    this._changed = true
    // A number indicating the loading state of the module this Entry is managing.
    this._loaded = 0
    // The object of bindings this Entry is tracking.
    this.bindings = createNamespace()
    // The child entries of this Entry.
    this.children = new OrderedMap
    // The module.exports of the module this Entry is managing.
    this.exports = exported
    // Getters for local variables exported from the managed module.
    this.getters = new OrderedMap
    // An alias of bindings that object importers receive.
    this.namespace = this.bindings
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
      // entry.update(), so that runtime.watch() behaves as expected.
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

    const bindings = this.bindings

    utils.setGetter(this, "namespace", () => {
      utils.setProperty(this, "namespace", { value: bindings })

      // Section 9.4.6.11
      // Step 7: Enforce sorted iteration order of properties
      // https://tc39.github.io/ecma262/#sec-modulenamespacecreate
      let i = -1
      const keys = Object.keys(bindings).sort()
      const keyCount = keys.length

      while (++i < keyCount) {
        utils.assignProperty(bindings, bindings, keys[i], true)
      }

      return Object.seal(bindings)
    })

    return this._loaded = 1
  }

  update() {
    // Lazily-initialized mapping of parent module identifiers to parent
    // module objects whose setters we might need to run.
    const parentsMap = new OrderedMap

    forEachSetter(this, (setter, value) => {
      parentsMap.set(setter.parent.id, setter.parent)
      setter(value)
    })

    // If any of the setters updated the bindings of a parent module,
    // or updated local variables that are exported by that parent module,
    // then we must re-run any setters registered by that parent module.
    let i = -1
    const parents = parentsMap.values()
    const parentCount = parents.length

    while (++i < parentCount) {
      // What happens if parents[parentIDs[id]] === module, or if
      // longer cycles exist in the parent chain? Thanks to our setter.last
      // bookkeeping in changed(), the entry.update() broadcast will only
      // proceed as far as there are any actual changes to report.
      const parent = parents[i]
      const parentEntry = Entry.get(parent.exports)

      if (parentEntry) {
        parentEntry.update()
      }
    }

    return this
  }
}

function assignExportsToBindings(entry) {
  const bindings = entry.bindings
  const exported = entry.exports
  const isESM = utils.isESModuleLike(exported)

  // Add a "default" property unless it's a Babel-like exports, in which case
  // the exported object should be namespace-like and safe to assign directly.
  if (! isESM) {
    bindings.default = exported
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
      bindings[key] = exported[key]
    } else if (key !== "default") {
      utils.assignProperty(bindings, exported, key)
    }
  }
}

function changed(setter, key, value) {
  if (compare(setter.last, key, value)) {
    return false
  }

  setter.last[key] = value
  return true
}

function compare(object, key, value) {
  return key in object && Object.is(object[key], value)
}

function createNamespace() {
  const namespace = new FastObject

  if (useToStringTag) {
    utils.setProperty(namespace, Symbol.toStringTag, {
      configurable: false,
      enumerable: false,
      value: "Module",
      writable: false
    })
  }
  return namespace
}

// Invoke the given callback for every setter that needs to be called.
// Note: forEachSetter() does not call setters directly, only the given callback.
function forEachSetter(entry, callback) {
  runGetters(entry)

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
      const setter = setters[j]
      if (entry._changed || changed(setter, name, value)) {
        callback(setter, value)
      }
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
      // reported that constant value.
      entry.getters.set(name, void 0)
      setters.length = 0
    }
  }

  entry._changed = false
}

function getExportByName(entry, name) {
  return name === "*"
    ? entry.namespace
    : entry.bindings[name]
}

function runGetter(getter) {
  if (typeof getter === "function") {
    try {
      const result = getter()
      ++getter.runCount
      return result
    } catch (e) {}
  }

  return GETTER_ERROR
}

function runGetters(entry) {
  if (! utils.isESModule(entry.exports)) {
    assignExportsToBindings(entry)
    return
  }

  let i = -1
  const bindings = entry.bindings
  const getters = entry.getters.values()
  const names = entry.getters.keys()
  const nameCount = names.length

  while (++i < nameCount) {
    const name = names[i]
    const value = runGetter(getters[i])

    if (value !== GETTER_ERROR &&
        ! compare(bindings, name, value)) {
      entry._changed = true
      bindings[name] = value
    }
  }
}

Object.setPrototypeOf(Entry.prototype, null)

export default Entry
