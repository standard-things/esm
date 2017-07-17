import FastObject from "./fast-object.js"
import OrderedMap from "./ordered-map.js"

import assignProperty from "./util/assign-property.js"
import createOptions from "./util/create-options.js"
import isESModule from "./util/is-esmodule.js"
import isESModuleLike from "./util/is-esmodule-like.js"
import isObjectLike from "./util/is-object-like.js"
import keys from "./util/keys.js"
import setGetter from "./util/set-getter.js"
import setProperty from "./util/set-property.js"

const GETTER_ERROR = {}
const entryMap = new WeakMap
const useToStringTag = typeof Symbol.toStringTag === "symbol"

class Entry {
  /* eslint lines-around-comment: off */
  constructor(mod, exported, options) {
    // A boolean indicating whether the module namespace has changed.
    this._changed = true
    // A number indicating the loading state of the module.
    this._loaded = 0
    // The raw namespace object.
    this._namespace = createNamespace()
    // The child entries of the module.
    this.children = new OrderedMap
    // The module.exports of the module.
    this.exports = exported
    // Getters for local variables exported from the module.
    this.getters = new OrderedMap
    // The module this entry is managing.
    this.module = mod
    // The namespace alias that object importers receive.
    this.namespace = this._namespace
    // The package options for this entry.
    this.options = createOptions(options)
    // Setters for assigning to local variables in parent modules.
    this.setters = new OrderedMap
    // Detect the module type.
    this.sourceType = "script"

    if (isESModule(exported)) {
      this.sourceType = "module"
    } else if (isESModuleLike(exported)) {
      this.sourceType = "module-like"
    }
  }

  static get(mod, exported, options) {
    if (arguments.length === 1) {
      exported = mod.exports
    }

    if (isObjectLike(exported)) {
      let entry = entryMap.get(exported)
      if (entry === void 0) {
        entry = new Entry(mod, exported, options)
        entryMap.set(exported, entry)
      }
      return entry
    }

    // Create a temporary Entry object to call entry.addSetters() and trigger
    // entry.update(), so that runtime.watch() behaves as expected.
    return new Entry(mod, exported)
  }

  addGetters(getterPairs) {
    let i = -1
    const pairCount = getterPairs.length

    while (++i < pairCount) {
      const pair = getterPairs[i]
      const name = pair[0]
      const getter = pair[1]

      getter.owner = this.module
      this.getters.set(name, getter)
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

    if (! this.module.loaded) {
      return this._loaded = 0
    }

    let i = -1
    const children = this.children.values()
    const childCount = children.length

    while (++i < childCount) {
      if (! children[i].loaded()) {
        return this._loaded = 0
      }
    }

    setGetter(this, "namespace", () => {
      const namespace = this._namespace
      setProperty(this, "namespace", { value: namespace })

      // Section 9.4.6.11
      // Step 7: Enforce sorted iteration order of properties
      // https://tc39.github.io/ecma262/#sec-modulenamespacecreate
      let i = -1
      const names = keys(namespace).sort()
      const nameCount = names.length

      while (++i < nameCount) {
        assignProperty(namespace, namespace, names[i], true)
      }

      return Object.seal(namespace)
    })

    return this._loaded = 1
  }

  merge(otherEntry) {
    const getters = this.getters
    const namespace = this._namespace
    const isESM = otherEntry.sourceType !== "script"
    const otherGetters = otherEntry.getters
    const otherNamespace = otherEntry._namespace

    for (const key in otherNamespace) {
      if (key === "default") {
        continue
      }

      let getter = getters.get(key)
      const otherGetter = otherGetters.get(key)

      if (typeof getter !== "function" &&
          typeof otherGetter === "function") {
        getter = otherGetter
        getters.set(key, getter)
      }

      if (typeof getter !== "function" ||
          typeof otherGetter !== "function") {
        continue
      }

      if (getter.owner.id === otherGetter.owner.id) {
        if (isESM) {
          namespace[key] = otherNamespace[key]
        } else {
          assignProperty(namespace, otherNamespace, key)
        }
      } else {
        throw new SyntaxError("Identifier '" + key + "' has already been declared")
      }
    }
  }

  update() {
    // Lazily-initialized mapping of parent module identifiers to parent
    // module objects whose setters we might need to run.
    const parentsMap = new OrderedMap

    forEachSetter(this, (setter, value) => {
      parentsMap.set(setter.parent.id, setter.parent)
      setter(value, this)
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
      Entry.get(parents[i]).update()
    }

    return this
  }
}

function assignExportsToNamespace(entry) {
  const exported = entry.exports
  const namespace = entry._namespace
  const isESM = entry.sourceType !== "script"

  // Add a "default" property unless it's a Babel-like exports, in which case
  // the exported object should be namespace-like and safe to assign directly.
  if (! isESM) {
    namespace.default = exported
  }

  let i = -1
  const names = keys(exported)
  const nameCount = names.length

  while (++i < nameCount) {
    const name = names[i]

    if (isESM) {
      namespace[name] = exported[name]
    } else if (name !== "default") {
      assignProperty(namespace, exported, name)
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
    setProperty(namespace, Symbol.toStringTag, {
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
  entry._changed = false

  let i = -1
  const collections = entry.setters.values()
  const names = entry.setters.keys()
  const nameCount = names.length

  if (nameCount) {
    runGetters(entry)
  }

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
  }

  entry._changed = false
}

function getExportByName(entry, name) {
  return name === "*"
    ? entry.namespace
    : entry._namespace[name]
}

function runGetter(getter) {
  if (typeof getter === "function") {
    try {
      return getter()
    } catch (e) {}
  }

  return GETTER_ERROR
}

function runGetters(entry) {
  if (entry.sourceType !== "module") {
    assignExportsToNamespace(entry)
    return
  }

  let i = -1
  const namespace = entry._namespace
  const getters = entry.getters.values()
  const names = entry.getters.keys()
  const nameCount = names.length

  while (++i < nameCount) {
    const name = names[i]
    const value = runGetter(getters[i])

    if (value !== GETTER_ERROR &&
        ! compare(namespace, name, value)) {
      entry._changed = true
      namespace[name] = value
    }
  }
}

Object.setPrototypeOf(Entry.prototype, null)

export default Entry
