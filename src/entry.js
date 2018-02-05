import NullObject from "./null-object.js"
import Package from "./package.js"
import SafeProxy from "./safe-proxy.js"

import assign from "./util/assign.js"
import assignProperty from "./util/assign-property.js"
import errors from "./errors.js"
import getModuleName from "./util/get-module-name.js"
import has from "./util/has.js"
import isObjectLike from "./util/is-object-like.js"
import setGetter from "./util/set-getter.js"
import setProperty from "./util/set-property.js"
import setSetter from "./util/set-setter.js"
import shared from "./shared.js"
import warn from "./warn.js"

const GETTER_ERROR = {}
const STAR_ERROR = {}

const { is, isSealed, keys, seal } = Object
const { sort } = Array.prototype
const { toStringTag } = Symbol

const useProxy = typeof SafeProxy === "function"
const useToStringTag = typeof toStringTag === "symbol"

const esmDescriptor = {
  configurable: false,
  enumerable: false,
  value: true,
  writable: false
}

const toStringTagDescriptor = {
  configurable: false,
  enumerable: false,
  value: "Module",
  writable: false
}

class Entry {
  constructor(mod) {
    // The namespace object change indicator.
    this._changed = false
    // The loading state of the module.
    this._loaded = 0
    // The raw namespace object.
    this._namespace = new NullObject
    // The load mode for `module.require`.
    this._requireESM = false
    // The builtin module indicator.
    this.builtin = false
    // The cache file name of the module.
    this.cacheName = null
    // The child entries of the module.
    this.children = new NullObject
    // The namespace object CJS importers receive.
    this.cjsNamespace = this._namespace
    // The package data of the module.
    this.package = Package.from(mod)
    // The namespace object ESM importers receive.
    this.esmNamespace = this._namespace
    // The initial `module.exports` value.
    this.exports = null
    // Getters for local variables exported by the module.
    this.getters = new NullObject
    // The unique id for the module cache.
    this.id = null
    // The module the entry is managing.
    this.module = mod
    // The `module.parent` entry.
    this.parent = null
    // The name of the runtime identifier.
    this.runtimeName = null
    // Setters for assigning to local variables in parent modules.
    this.setters = new NullObject
    // Initialize empty namespace setter so they are merged properly.
    this.setters["*"] = []
    // The state of the module:
    //   1 - Parsing phase started.
    //   2 - Parsing phase completed.
    //   3 - Execution phase started.
    //   4 - Execution phase completed.
    this.state = 0
    // The file url of the module.
    this.url = null
  }

  static get(mod) {
    if (! mod) {
      return null
    }

    const exported = mod.exports
    const useExports = isObjectLike(exported)
    let entry = shared.entry.get(useExports ? exported : mod)

    if (! entry &&
        useExports) {
      entry = shared.entry.get(mod)
    }

    if (! entry) {
      entry = new Entry(mod)
      Entry.set(mod, exported, entry)
    }

    return entry
  }

  static has(mod) {
    if (! mod) {
      return false
    }

    const exported = mod.exports
    return shared.entry.has(isObjectLike(exported) ? exported : mod)
  }

  static set(mod, exported, entry) {
    if (mod) {
      shared.entry.set(mod, entry)
    }

    if (isObjectLike(exported)) {
      shared.entry.set(exported, entry)
    }
  }

  addGetter(name, getter) {
    getter.owner = this
    this.getters[name] = getter
    return this
  }

  addGetters(getterPairs) {
    for (const [name, getter] of getterPairs) {
      this.addGetter(name, getter)
    }

    return this
  }

  addGettersFrom(otherEntry) {
    const { getters } = this
    const { getters:otherGetters } = otherEntry
    const name = getModuleName(this.module)

    for (const key in otherEntry._namespace) {
      if (key === "default") {
        continue
      }

      let getter = getters[key]
      const otherGetter = otherGetters[key]

      if (typeof getter !== "function" &&
          typeof otherGetter === "function") {
        getter = otherGetter
        getters[key] = getter
      }

      const cached = this.package.cache[this.cacheName]
      const isESM = cached && cached.esm

      if (isESM ||
          typeof getter !== "function" ||
          typeof otherGetter !== "function") {
        continue
      }

      const ownerName = getModuleName(getter.owner.module)

      if (ownerName !== name &&
          ownerName !== getModuleName(otherGetter.owner.module)) {
        this.addGetter(key, () => STAR_ERROR)
      }
    }

    return this
  }

  addSetter(name, setter, parent) {
    const setters = this.setters[name] || (this.setters[name] = [])
    setter.last = new NullObject
    setter.parent = parent
    setters.push(setter)
    return this
  }

  addSetters(setterPairs, parent) {
    for (const [name, setter] of setterPairs) {
      this.addSetter(name, setter, parent)
    }

    return this
  }

  loaded() {
    if (this._loaded) {
      return this._loaded
    }

    if (! this.module.loaded) {
      return this._loaded = 0
    }

    this._loaded = -1

    const { children } = this

    for (const id in children) {
      if (! children[id].loaded()) {
        return this._loaded = 0
      }
    }

    const cached = this.package.cache[this.cacheName]
    const isESM = cached && cached.esm

    let setGetters = true

    if (isESM) {
      const exported = this.module.exports

      if (! isSealed(exported)) {
        for (const name in this._namespace) {
          setGetter(exported, name, () => {
            return this._namespace[name]
          })
        }
      }

      if (this.package.options.cjs.interop &&
          ! has(exported, "__esModule")) {
        setProperty(exported, "__esModule", esmDescriptor)
      }

      seal(exported)
    } else {
      const otherEntry = Entry.get(this.module)
      setGetters = otherEntry._loaded !== 1
      this.merge(otherEntry)

      const mod = this.module
      Entry.set(mod, mod.exports, this)

      if (! mod.loaded) {
        return this._loaded = 0
      }
    }

    assignExportsToNamespace(this)

    if (setGetters) {
      setGetter(this, "esmNamespace", () => {
        return this.esmNamespace = toNamespace(this)
      })

      setSetter(this, "esmNamespace", (value) => {
        setProperty(this, "esmNamespace", { value })
      })

      setGetter(this, "cjsNamespace", () => {
        return this.cjsNamespace = toNamespace(this, {
          default: this.module.exports
        })
      })

      setSetter(this, "cjsNamespace", (value) => {
        setProperty(this, "cjsNamespace", { value })
      })
    }

    return this._loaded = 1
  }

  merge(otherEntry) {
    if (otherEntry !== this) {
      for (const key in otherEntry) {
        mergeProperty(this, otherEntry, key)
      }
    }

    return this
  }

  update() {
    // Lazily-initialized mapping of parent module identifiers to parent
    // module objects whose setters we might need to run.
    let parentsMap

    this._changed = false

    runGetters(this)
    runSetters(this, (setter, value) => {
      parentsMap || (parentsMap = new NullObject)
      parentsMap[getModuleName(setter.parent.module)] = setter.parent
      setter(value, this)
    })

    this._changed = false

    // If any of the setters updated the bindings of a parent module,
    // or updated local variables that are exported by that parent module,
    // then we must re-run any setters registered by that parent module.
    for (const id in parentsMap) {
      // What happens if `parents[parentIDs[id]] === module`, or if
      // longer cycles exist in the parent chain? Thanks to our `setter.last`
      // bookkeeping in `changed()`, the `entry.update()` broadcast will only
      // proceed as far as there are any actual changes to report.
      parentsMap[id].update()
    }

    return this
  }
}

function assignExportsToNamespace(entry) {
  const { _namespace, getters } = entry
  const exported = entry.module.exports
  const pkg = entry.package
  const cached = pkg.cache[entry.cacheName]
  const isESM = cached && cached.esm

  const inModule =
    isESM ||
    (pkg.options.cjs.interop &&
     has(exported, "__esModule") &&
     !! exported.__esModule)

  if (! inModule) {
    _namespace.default = exported

    if (! ("default" in getters)) {
      entry.addGetter("default", () => entry._namespace.default)
    }
  }

  if (! isObjectLike(exported)) {
    return
  }

  const object = entry._loaded === 1 ? _namespace : exported
  const names = keys(object)

  for (const name of names) {
    if (isESM) {
      _namespace[name] = exported[name]
    } else if ((inModule || name !== "default") &&
        ! has(_namespace, name)) {
      setGetter(_namespace, name, () => {
        return exported[name]
      })

      setSetter(_namespace, name, (value) => {
        exported[name] = value
      })
    }

    if (! (name in getters)) {
      entry.addGetter(name, () => entry._namespace[name])
    }
  }
}

function callGetter(getter) {
  try {
    return getter()
  } catch (e) {}

  return GETTER_ERROR
}

function changed(setter, key, value) {
  const { last } = setter

  if (is(last[key], value)) {
    return false
  }

  last[key] = value
  return true
}

function createNamespace() {
  // Section 9.4.6: Module Namespace Exotic Objects
  // Module namespace objects have a null [[Prototype]].
  // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
  const namespace = new NullObject

  // Section 26.3.1: @@toStringTag
  // Module namespace objects have a @@toStringTag value of "Module".
  // https://tc39.github.io/ecma262/#sec-@@tostringtag
  return useToStringTag
    ? setProperty(namespace, toStringTag, toStringTagDescriptor)
    : namespace
}

function getExportByName(entry, setter, name) {
  const cached = entry.package.cache[entry.cacheName]
  const isESM = cached && cached.esm

  const isScript =
    ! isESM &&
    ! setter.parent.package.options.cjs.namedExports

  if (name === "*") {
    return isScript ? entry.cjsNamespace : entry.esmNamespace
  }

  if (isESM) {
    return entry._namespace[name]
  }

  if ((isScript &&
       name !== "default") ||
      (entry._loaded === 1 &&
       ! (name in entry.getters))) {
    // Remove problematic setter to unblock subsequent imports.
    delete entry.setters[name]
    throw new errors.SyntaxError("ERR_EXPORT_MISSING", entry.module, name)
  }

  const value = entry._namespace[name]

  if (value === STAR_ERROR) {
    throw new errors.SyntaxError("ERR_EXPORT_STAR_CONFLICT", entry.module, name)
  }

  return value
}

function mergeProperty(entry, otherEntry, key) {
  if ((entry._loaded || otherEntry._loaded) &&
      (key === "cjsNamespace" || key === "esmNamespace")) {
    return assignProperty(entry, otherEntry, key)
  }

  const value = otherEntry[key]

  if (key !== "setters") {
    if (key === "children") {
      assign(entry.children, value)
    } else if (key === "getters") {
      for (const name in value) {
        entry.addGetter(name, value[name])
      }
    } else if (key ===  "_loaded"
        ? value > entry._loaded
        : value != null) {
      entry[key] = value
    }

    return entry
  }

  const settersMap = entry.setters

  for (const name in value) {
    const setters = settersMap[name]
    const otherSetters = settersMap[name] = value[name]

    for (const setter of setters) {
      if (otherSetters.indexOf(setter) === -1) {
        otherSetters.push(setter)
      }
    }
  }

  return entry
}

function runGetter(entry, name) {
  const { _namespace } = entry
  const value = callGetter(entry.getters[name])

  if (value !== GETTER_ERROR &&
      ! (name in _namespace &&
         is(_namespace[name], value))) {
    entry._changed = true
    _namespace[name] = value
  }
}

function runGetters(entry) {
  const cached = entry.package.cache[entry.cacheName]
  const isESM = cached && cached.esm

  if (isESM) {
    for (const name in entry.getters) {
      runGetter(entry, name)
    }
  } else {
    assignExportsToNamespace(entry)
  }
}

function runSetter(entry, name, callback) {
  const { children, getters } = entry
  const nsChanged = name === "*" && entry._changed

  for (const setter of entry.setters[name]) {
    const nsSetter = setter.from === "nsSetter"
    const force = nsChanged && nsSetter
    const value = force ? void 0 : getExportByName(entry, setter, name)

    if (force ||
        changed(setter, name, value)) {
      callback(setter, value)
    } else if (value === void 0 &&
        name in getters &&
        getModuleName(setter.parent.module) in children) {
      warn("WRN_TDZ_ACCESS", entry.module, name)
    }
  }
}

function runSetters(entry, callback) {
  for (const name in entry.setters) {
    runSetter(entry, name, callback)
  }
}

function toNamespace(entry, source = entry._namespace) {
  return useProxy
    ? toNamespaceProxy(entry, source)
    : toNamespaceGetter(entry, source)
}

function toNamespaceGetter(entry, source = entry._namespace) {
  // Section 9.4.6.11: ModuleNamespaceCreate ( module, exports )
  // Step 7: Module namespace objects have sorted properties.
  // https://tc39.github.io/ecma262/#sec-modulenamespacecreate
  const names = sort.call(keys(source))
  const namespace = createNamespace()

  for (const name of names) {
    setGetter(namespace, name, () => {
      if (useToStringTag &&
          name === toStringTag) {
        return namespace[name]
      }

      return source[name]
    })

    setSetter(namespace, name, () => {
      if (entry.package.options.warnings) {
        if (name in source) {
          warn("WRN_NS_ASSIGNMENT", entry.module, name)
        } else {
          warn("WRN_NS_EXTENSION", entry.module, name)
        }
      }
    })
  }

  // Section 9.4.6: Module Namespace Exotic Objects
  // Module namespace sources are not extensible.
  // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
  return seal(namespace)
}

function toNamespaceProxy(entry, source = entry._namespace) {
  const names = sort.call(keys(source))
  const namespace = createNamespace()

  for (const name of names) {
    namespace[name] = void 0
  }

  return new SafeProxy(seal(namespace), {
    get: (namespace, name) => {
      if (useToStringTag &&
          name === toStringTag) {
        return namespace[name]
      }

      return source[name]
    },
    getOwnPropertyDescriptor: (namespace, name) => {
      if (! (name in namespace)) {
        return
      }

      const descriptor = {
        configurable: false,
        enumerable: false,
        value: "Module",
        writable: false
      }

      // Section 26.3.1: @@toStringTag
      // Return descriptor of the module namespace @@toStringTag.
      // https://tc39.github.io/ecma262/#sec-@@tostringtag
      if (useToStringTag &&
          name === toStringTag) {
        return descriptor
      }

      // Section 9.4.6: Module Namespace Exotic Objects
      // Return descriptor of the non-extensible module namespace property.
      // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
      descriptor.enumerable =
      descriptor.writable = true
      descriptor.value = source[name]

      return descriptor
    },
    set: (namespace, name) => {
      if (entry.package.options.warnings) {
        if (name in source) {
          warn("WRN_NS_ASSIGNMENT", entry.module, name)
        } else {
          warn("WRN_NS_EXTENSION", entry.module, name)
        }
      }

      return true
    }
  })
}

Object.setPrototypeOf(Entry.prototype, null)

export default Entry
