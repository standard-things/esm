import ENTRY from "./constant/entry.js"

import GenericArray from "./generic/array.js"
import OwnProxy from "./own/proxy.js"
import Package from "./package.js"

import assign from "./util/assign.js"
import copyProperty from "./util/copy-property.js"
import errors from "./errors.js"
import getModuleName from "./util/get-module-name.js"
import has from "./util/has.js"
import isMJS from "./util/is-mjs.js"
import isObjectLike from "./util/is-object-like.js"
import keys from "./util/keys.js"
import proxyExports from "./util/proxy-exports.js"
import setDeferred from "./util/set-deferred.js"
import setGetter from "./util/set-getter.js"
import setSetter from "./util/set-setter.js"
import shared from "./shared.js"
import toNamespaceObject from "./util/to-namespace-object.js"

const {
  LOAD_COMPLETED,
  LOAD_INCOMPLETE,
  LOAD_INDETERMINATE,
  STATE_INITIAL,
  TYPE_CJS,
  TYPE_ESM,
  TYPE_PSEUDO
} = ENTRY

const {
  ERR_EXPORT_MISSING,
  ERR_EXPORT_STAR_CONFLICT,
  ERR_NS_ASSIGNMENT,
  ERR_NS_DEFINITION,
  ERR_NS_DELETION,
  ERR_NS_EXTENSION,
  ERR_NS_REDEFINITION,
  ERR_UNDEFINED_IDENTIFIER
} = errors

const GETTER_ERROR = {}
const STAR_ERROR = {}

const pseudoDescriptor = {
  value: true
}

class Entry {
  constructor(mod) {
    // The namespace object change indicator.
    this._changed = false
    // The loading state of the module.
    this._loaded = LOAD_INCOMPLETE
    // The raw namespace object without proxied exports.
    this._namespace = { __proto__: null }
    // The passthru indicator for `module._compile`.
    this._passthru = false
    // The load type for `module.require`.
    this._require = TYPE_CJS
    // The name of the running setter.
    this._runningSetter = null
    // The initialized state of bindings imported by the module.
    this.bindings = { __proto__: null }
    // The builtin module indicator.
    this.builtin = false
    // The cache file name of the module.
    this.cacheName = null
    // The child entries of the module.
    this.children = { __proto__: null }
    // The source compilation data of the module.
    this.compileData = null
    // The cyclical module indicator.
    this.cyclical = false
    // The namespace object which may have proxied exports.
    this.namespace = this._namespace
    // The namespace object CJS importers receive.
    this.cjsNamespace = this.namespace
    // The namespace object ESM importers receive.
    this.esmNamespace = this.namespace
    // The temporary store of the initial `module.exports` value.
    this.exports = null
    // Getters for local variables exported by the module.
    this.getters = { __proto__: null }
    // The unique id for the module cache.
    this.id = mod.id
    // The module the entry is managing.
    this.module = mod
    // The name of the module.
    this.name = getModuleName(mod)
    // The package data of the module.
    this.package = Package.from(mod)
    // The `module.parent` entry.
    this.parent = null
    // The name of the runtime identifier.
    this.runtimeName = null
    // Setters for assigning to local variables in parent modules.
    this.setters = { __proto__: null }
    // Initialize empty namespace setter so they are merged properly.
    this.setters["*"] = []
    // The state of the module.
    this.state = STATE_INITIAL
    // The entry type of the module.
    this.type = TYPE_CJS
  }

  static delete(value) {
    if (isObjectLike(value)) {
      shared.entry.cache.delete(value)
    }
  }

  static get(mod) {
    if (! mod) {
      return null
    }

    const { cache, skipExports } = shared.entry
    const name = getModuleName(mod)

    let exported
    let useExports = false

    if (! skipExports[name]) {
      exported = mod.exports
      useExports = isObjectLike(exported)
    }

    let entry = cache.get(useExports ? exported : mod)

    if (! entry &&
        useExports) {
      entry = cache.get(mod)
    }

    if (! entry) {
      entry = new Entry(mod)
      Entry.set(mod, entry)
      Entry.set(exported, entry)
    }

    return entry
  }

  static has(value) {
    return shared.entry.cache.has(value)
  }

  static set(value, entry) {
    if (isObjectLike(value)) {
      shared.entry.cache.set(value, entry)
    }
  }

  addGetter(name, getter) {
    getter.owner = this
    this.getters[name] = getter
    return this
  }

  addGetters(argsList) {
    for (const [name, getter] of argsList) {
      this.addGetter(name, getter)
    }

    return this
  }

  addGettersFrom(otherEntry) {
    const { getters, name } = this
    const { getters:otherGetters } = otherEntry

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

      if (this.type === TYPE_ESM ||
          typeof getter !== "function" ||
          typeof otherGetter !== "function") {
        continue
      }

      const ownerName = getter.owner.name

      if (ownerName !== name &&
          ownerName !== otherGetter.owner.name) {
        this.addGetter(key, () => STAR_ERROR)
      }
    }

    return this
  }

  addSetter(name, localNames, setter, parent) {
    const setters =
      this.setters[name] ||
      (this.setters[name] = [])

    setter.last = { __proto__: null }
    setter.localNames = localNames
    setter.parent = parent

    GenericArray.push(setters, setter)

    for (const name of localNames) {
      this.bindings[name] = false
    }

    return this
  }

  addSetters(argsList, parent) {
    for (const [name, localNames, setter] of argsList) {
      this.addSetter(name, localNames, setter, parent)
    }

    return this
  }

  loaded() {
    if (this._loaded !== LOAD_INCOMPLETE) {
      return this._loaded
    }

    let mod = this.module

    if (! mod.loaded) {
      return this._loaded = LOAD_INCOMPLETE
    }

    this._loaded = LOAD_INDETERMINATE

    const { children } = this

    for (const id in children) {
      if (children[id].loaded() === LOAD_INCOMPLETE) {
        return this._loaded = LOAD_INCOMPLETE
      }
    }

    const isESM = this.type === TYPE_ESM

    let exported = mod.exports

    if (isESM &&
        ! Object.isFrozen(exported)) {
      if (this.package.options.cjs.interop &&
          ! has(this._namespace, "__esModule") &&
          ! isMJS(mod)) {
        Reflect.defineProperty(exported, "__esModule", pseudoDescriptor)
      }

      for (const name in this._namespace) {
        setGetter(exported, name, () => this._namespace[name])
      }

      Object.setPrototypeOf(exported, null)
      Object.freeze(exported)
      Object.freeze(mod)
    } else if (! isESM) {
      const newEntry = Entry.get(mod)

      this.merge(newEntry)

      const newMod = this.module
      const newExported = newMod.exports

      if (newMod !== mod) {
        Entry.delete(mod, this)
        Entry.set(newMod, this)
        mod = newMod
      }

      if (newExported !== exported) {
        Entry.delete(exported, this)
        Entry.set(newExported, this)
        exported = newExported
      }

      if (! mod.loaded) {
        return this._loaded = LOAD_INCOMPLETE
      }
    }

    assignExportsToNamespace(this)

    if (this._loaded !== LOAD_COMPLETED) {
      setDeferred(this, "cjsNamespace", () => createNamespace(this, {
        namespace: {
          default: this.module.exports
        }
      }))

      setDeferred(this, "esmNamespace", () => createNamespace(this))
    }

    Reflect.deleteProperty(shared.entry.skipExports, this.name)
    return this._loaded = LOAD_COMPLETED
  }

  merge(otherEntry) {
    if (otherEntry !== this) {
      for (const name in otherEntry) {
        mergeProperty(this, otherEntry, name)
      }
    }

    return this
  }

  update(names) {
    // Lazily-initialized map of parent module names to parent entries whose
    // setters might need to run.
    let parentsMap

    this._changed = false

    if (typeof names === "string") {
      names = [names]
    }

    runGetters(this, names)
    runSetters(this, names, (setter, value) => {
      const parentEntry = setter.parent
      const { bindings } = parentEntry
      const { localNames } = setter

      parentsMap || (parentsMap = { __proto__: null })
      parentsMap[parentEntry.name] = parentEntry

      setter(value, this)

      for (const name of localNames) {
        bindings[name] = true
      }
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

function assignExportsToNamespace(entry, names) {
  const { _namespace, getters } = entry
  const exported = entry.module.exports

  const isESM = entry.type === TYPE_ESM
  const isLoaded = entry._loaded === LOAD_COMPLETED

  if (! isESM &&
      ! isLoaded &&
      exported &&
      exported.__esModule &&
      exported.default &&
      entry.package.options.cjs.interop) {
    entry.type = TYPE_PSEUDO
  }

  const isCJS = entry.type === TYPE_CJS

  if (isCJS) {
    _namespace.default = exported

    if (! Reflect.has(getters, "default")) {
      entry.addGetter("default", () => entry.namespace.default)
    }
  }

  if (! isObjectLike(exported)) {
    return
  }

  if (! names) {
    names = keys(isLoaded ? _namespace : exported)
  }

  for (const name of names) {
    if (isESM) {
      _namespace[name] = exported[name]
    } else if (! (isCJS && name === "default") &&
        ! Reflect.has(_namespace, name)) {
      setGetter(_namespace, name, () => {
        if (has(exported, name)) {
          return exported[name]
        }
      })

      setSetter(_namespace, name, (value) => {
        exported[name] = value
      })
    }

    if (! Reflect.has(getters, name)) {
      entry.addGetter(name, () => entry.namespace[name])
    }
  }
}

function changed(setter, key, value) {
  const { last } = setter

  if (Object.is(last[key], value)) {
    return false
  }

  last[key] = value
  return true
}

function createNamespace(entry, source = entry) {
  const mod = entry.module
  const exported = mod.exports
  const { type } = entry

  const isCJS = type === TYPE_CJS
  const isESM = type === TYPE_ESM

  const namespace = toNamespaceObject(source.namespace, (target, name) => {
    if (isESM ||
        (isCJS && name === "default")) {
      return Reflect.get(target, name)
    }

    return Reflect.getOwnPropertyDescriptor(exported, name).value
  })

  const handler = {
    defineProperty(target, name, descriptor) {
      if (Reflect.defineProperty(target, name, descriptor)) {
        return true
      }

      const NsError = Reflect.has(source.namespace, name)
        ? ERR_NS_REDEFINITION
        : ERR_NS_DEFINITION

      throw new NsError(mod, name)
    },
    deleteProperty(target, name) {
      if (Reflect.deleteProperty(target, name)) {
        return true
      }

      throw new ERR_NS_DELETION(mod, name)
    },
    get(target, name, receiver) {
      if (name === Symbol.toStringTag) {
        return Reflect.get(target, name)
      }

      const { compileData } = entry
      const getter = entry.getters[name]
      const exportSpecifiers = compileData && compileData.exportSpecifiers

      if (getter &&
          exportSpecifiers &&
          exportSpecifiers[name] === 1 &&
          name !== "default") {
        return getter()
      }

      if (name === "default" &&
          ! getter) {
        throw new ERR_UNDEFINED_IDENTIFIER(name)
      }

      return Reflect.get(source.namespace, name, receiver)
    },
    getOwnPropertyDescriptor(target, name) {
      if (! Reflect.has(target, name)) {
        return
      }

      // The de facto order of descriptor properties is:
      // "value", "writable", "configurable", "enumerable"
      /* eslint-disable sort-keys */
      const descriptor = {
        value: "Module",
        writable: false,
        configurable: false,
        enumerable: false
      }

      // Section 26.3.1: @@toStringTag
      // Return descriptor of the module namespace @@toStringTag.
      // https://tc39.github.io/ecma262/#sec-@@tostringtag
      if (name === Symbol.toStringTag) {
        return descriptor
      }

      // Section 9.4.6: Module Namespace Exotic Objects
      // Return descriptor of the non-extensible module namespace property.
      // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
      descriptor.enumerable =
      descriptor.writable = true
      descriptor.value = handler.get(target, name)

      return descriptor
    },
    has(target, name) {
      return name === shared.symbol.namespace ||
        Reflect.has(target, name)
    },
    set(target, name) {
      const NsError = Reflect.has(source.namespace, name)
        ? ERR_NS_ASSIGNMENT
        : ERR_NS_EXTENSION

      throw new NsError(mod, name)
    }
  }

  return new OwnProxy(namespace, handler)
}

function getExportByName(entry, setter, name) {
  const { _namespace } = entry
  const isCJS = entry.type === TYPE_CJS
  const parentEntry = setter.parent

  const parentNamedExports =
    entry.builtin ||
    (parentEntry.package.options.cjs.namedExports &&
     ! isMJS(parentEntry.module))

  const noNamedExports =
    isCJS &&
    ! parentNamedExports

  if (isCJS &&
      parentNamedExports &&
      entry.namespace === _namespace) {
    // Lazily assign proxied namespace object.
    entry.namespace = new OwnProxy(_namespace, {
      get(target, name, receiver) {
        const exported = proxyExports(entry)

        if (name === "default") {
          return exported
        }

        if (has(exported, name)) {
          target = exported
        }

        return Reflect.get(target, name, receiver)
      }
    })
  }

  if (name === "*") {
    return noNamedExports ? entry.cjsNamespace : entry.esmNamespace
  }

  const mod = entry.module

  if ((noNamedExports &&
       name !== "default") ||
      (entry._loaded === LOAD_COMPLETED &&
       ! Reflect.has(entry.getters, name))) {
    // Remove problematic setter to unblock subsequent imports.
    Reflect.deleteProperty(entry.setters, name)
    throw new ERR_EXPORT_MISSING(mod, name)
  }

  const value = tryGetter(entry.getters[name])

  if (value === STAR_ERROR) {
    throw new ERR_EXPORT_STAR_CONFLICT(mod, name)
  }

  if (value !== GETTER_ERROR) {
    return value
  }
}

function mergeProperty(entry, otherEntry, key) {
  if ((entry._loaded !== LOAD_INCOMPLETE ||
       otherEntry._loaded !== LOAD_INCOMPLETE) &&
      (key === "cjsNamespace" ||
       key === "esmNamespace")) {
    return copyProperty(entry, otherEntry, key)
  }

  const value = otherEntry[key]

  if (key !== "setters") {
    if (key ===  "_loaded") {
      if (value > entry._loaded) {
        entry._loaded = value
      }
    } else if (key === "children") {
      assign(entry.children, value)
    } else if (key === "getters") {
      for (const name in value) {
        entry.addGetter(name, value[name])
      }
    } else if (value != null) {
      entry[key] = value
    }

    return entry
  }

  const settersMap = entry.setters

  for (const name in value) {
    const setters = settersMap[name]
    const otherSetters = settersMap[name] = value[name]

    for (const setter of setters) {
      if (GenericArray.indexOf(otherSetters, setter) === -1) {
        GenericArray.push(otherSetters, setter)
      }
    }
  }

  return entry
}

function runGetter(entry, name) {
  const { _namespace } = entry
  const value = tryGetter(entry.getters[name])

  if (value !== GETTER_ERROR &&
      ! (Reflect.has(_namespace, name) &&
         Object.is(_namespace[name], value))) {
    entry._changed = true
    _namespace[name] = value
  }
}

function runGetters(entry, names) {
  if (entry.type === TYPE_ESM) {
    if (names) {
      for (const name of names) {
        runGetter(entry, name)
      }
    } else {
      for (const name in entry.getters) {
        runGetter(entry, name)
      }
    }
  } else {
    assignExportsToNamespace(entry, names)
  }
}

function runSetter(entry, name, callback) {
  entry._runningSetter = name

  const nsChanged = name === "*" && entry._changed

  try {
    for (const setter of entry.setters[name]) {
      const force = nsChanged && setter.from === "nsSetter"
      const value = force ? void 0 : getExportByName(entry, setter, name)

      if (force ||
          changed(setter, name, value)) {
        callback(setter, value)
      }
    }
  } finally {
    entry._runningSetter = null
  }
}

function runSetters(entry, names, callback) {
  const { _runningSetter } = entry

  if (names) {
    for (const name of names) {
      if (name === _runningSetter) {
        break
      }

      runSetter(entry, name, callback)
    }
  } else {
    for (const name in entry.setters) {
      if (name === _runningSetter) {
        break
      }

      runSetter(entry, name, callback)
    }
  }
}

function tryGetter(getter) {
  try {
    return getter()
  } catch (e) {}

  return GETTER_ERROR
}

Reflect.setPrototypeOf(Entry.prototype, null)

export default Entry
