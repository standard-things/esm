import ENTRY from "./constant/entry.js"

import OwnProxy from "./own/proxy.js"
import Package from "./package.js"
import SafeObject from "./safe/object.js"

import assign from "./util/assign.js"
import copyProperty from "./util/copy-property.js"
import errors from "./errors.js"
import getModuleName from "./util/get-module-name.js"
import has from "./util/has.js"
import isMJS from "./util/is-mjs.js"
import isObjectLike from "./util/is-object-like.js"
import keys from "./util/keys.js"
import noop from "./util/noop.js"
import proxyExports from "./util/proxy-exports.js"
import setDeferred from "./util/set-deferred.js"
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

const noopSetter = () => {}

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
    this._namespace = toNamespaceObject()
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
    // The mutable namespace object CJS importers receive.
    this.cjsMutableNamespace = this.namespace
    // The namespace object CJS importers receive.
    this.cjsNamespace = this.namespace
    // The mutable namespace object ESM importers receive.
    this.esmMutableNamespace = this.namespace
    // The namespace object ESM importers receive.
    this.esmNamespace = this.namespace
    // The `module.exports` value at the time the module loaded.
    this.exports = mod.exports
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
    shared.entry.cache.delete(value)
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
    const { getters } = this
    const inited = Reflect.has(getters, name)

    getters[name] = getter

    if (! has(getter, "owner")) {
      getter.owner = this
    }

    if (inited) {
      return this
    }

    const { _namespace } = this

    const descriptor = {
      configurable: true,
      enumerable: true,
      get: null,
      set: null
    }

    if (this.type === TYPE_CJS &&
        name === "default") {
      descriptor.get = () => this.exports

      descriptor.set = function (value) {
        Reflect.defineProperty(this, name, {
          configurable: true,
          enumerable: true,
          value,
          writable: true
        })
      }
    } else {
      descriptor.get = () => {
        const exported = this.exports

        if (has(exported, name)) {
          return exported[name]
        }
      }

      descriptor.set = (value) => {
        this.exports[name] = value
      }
    }

    Reflect.defineProperty(_namespace, name, descriptor)
    return this
  }

  addGetters(argsList) {
    for (const [name, getter] of argsList) {
      this.addGetter(name, getter)
    }

    return this
  }

  addGettersFrom(otherEntry) {
    const { getters } = this
    const { getters:otherGetters } = otherEntry

    assignExportsToNamespace(this)
    assignExportsToNamespace(otherEntry)

    for (const key in otherEntry._namespace) {
      if (key === "default") {
        continue
      }

      let getter = getters[key]

      const otherGetter = otherGetters[key]

      if (typeof getter !== "function" &&
          typeof otherGetter === "function") {
        getter = otherGetter
        this.addGetter(key, getter)
        runGetter(this, key)
      }

      if (this.type === TYPE_ESM ||
          typeof getter !== "function" ||
          typeof otherGetter !== "function") {
        continue
      }

      const ownerName = getter.owner.name

      if (ownerName !== this.name &&
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

    setter.from = setter.from || ""
    setter.last = { __proto__: null }
    setter.localNames = localNames
    setter.parent = parent

    setters.push(setter)

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

  initNamespace() {
    this.initNamespace = noop

    setDeferred(this, "cjsMutableNamespace", function () {
      return createMutableNamespaceProxy(this, {
        namespace: toNamespaceObject({
          default: this.module.exports
        })
      })
    })

    setDeferred(this, "cjsNamespace", function () {
      return createNamespaceProxy(this, {
        namespace: toNamespaceObject({
          default: this.module.exports
        })
      })
    })

    setDeferred(this, "esmMutableNamespace", function () {
      return createMutableNamespaceProxy(this)
    })

    setDeferred(this, "esmNamespace", function () {
      return createNamespaceProxy(this)
    })
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

    if (this.type === TYPE_ESM) {
      const exported = this.exports
      const { getters } = this
      const names = keys(exported)

      for (const name of names) {
        if (! Reflect.has(getters, name)) {
          this.addGetter(name, () => this.namespace[name])
        }
      }

      if (this.package.options.cjs.interop &&
          ! Reflect.has(getters, "__esModule") &&
          ! isMJS(mod)) {
        Reflect.defineProperty(exported, "__esModule", pseudoDescriptor)
      }
    } else {
      const exported = mod.exports

      this.merge(Entry.get(mod))

      const newMod = this.module
      const newExported = newMod.exports

      if (newMod !== mod) {
        Entry.delete(mod, this)
        Entry.set(newMod, this)
      }

      if (newExported !== exported) {
        Entry.delete(exported, this)
        Entry.set(newExported, this)
      }

      if (! newMod.loaded) {
        return this._loaded = LOAD_INCOMPLETE
      }

      this.exports = newExported
      assignExportsToNamespace(this)
    }

    this.initNamespace()
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
  const exported = entry.exports
  const isLoaded = entry._loaded === LOAD_COMPLETED

  if (! isLoaded &&
      exported &&
      exported.__esModule &&
      entry.package.options.cjs.interop) {
    entry.type = TYPE_PSEUDO
  }

  const { getters } = entry
  const isCJS = entry.type === TYPE_CJS

  if (isCJS &&
      ! Reflect.has(getters, "default")) {
    entry.addGetter("default", () => entry.namespace.default)
  }

  if (! isObjectLike(exported)) {
    return
  }

  if (! names) {
    names = keys(isLoaded ? entry._namespace : exported)
  }

  for (const name of names) {
    if (! (isCJS && name === "default") &&
        ! Reflect.has(getters, name)) {
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

function createNamespace(entry, source) {
  const { type } = entry
  const isCJS = type === TYPE_CJS
  const isESM = type === TYPE_ESM

  return toNamespaceObject(source.namespace, (target, name) => {
    if (isESM ||
        (isCJS && name === "default")) {
      return Reflect.get(target, name)
    }

    return Reflect.getOwnPropertyDescriptor(entry.exports, name).value
  })
}

function createNamespaceHandler(entry, source, mutable) {
  const handler = {
    get(target, name, receiver) {
      const { compileData } = entry
      const exportSpecifiers = compileData && compileData.exportSpecifiers
      const getter = entry.getters[name]

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

    has(target, name) {
      return name === shared.symbol.namespace ||
        Reflect.has(source.namespace, name)
    }
  }

  if (mutable) {
    handler.defineProperty = (target, name, descriptor) => {
      SafeObject.defineProperty(entry.exports, name, descriptor)

      if (Reflect.has(source.namespace, name)) {
        entry
          .addGetter(name, () => entry.namespace[name])
          .update(name)
      }

      return true
    }

    handler.deleteProperty = (target, name) => {
      if (Reflect.deleteProperty(entry.exports, name)) {
        if (Reflect.has(source.namespace, name)) {
          entry
            .addGetter(name, () => entry.namespace[name])
            .update(name)
        }

        return true
      }

      return false
    }

    handler.getOwnPropertyDescriptor = (target, name) => {
      const exported = entry.exports

      if (has(exported, name)) {
        return Reflect.getOwnPropertyDescriptor(exported, name)
      }

      const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

      if (descriptor) {
        descriptor.value = handler.get(target, name)
      }

      return descriptor
    }

    handler.set = (target, name, value, receiver) => {
      if (Reflect.set(entry.exports, name, value, receiver)) {
        if (Reflect.has(source.namespace, name)) {
          entry
            .addGetter(name, () => entry.namespace[name])
            .update(name)
        }

        return true
      }

      return false
    }
  } else {
    handler.defineProperty = (target, name, descriptor) => {
      if (Reflect.defineProperty(target, name, descriptor)) {
        return true
      }

      const NsError = Reflect.has(source.namespace, name)
        ? ERR_NS_REDEFINITION
        : ERR_NS_DEFINITION

      throw new NsError(entry.module, name)
    }

    handler.deleteProperty = (target, name) => {
      if (Reflect.deleteProperty(target, name)) {
        return true
      }

      throw new ERR_NS_DELETION(entry.module, name)
    }

    handler.getOwnPropertyDescriptor = (target, name) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

      if (descriptor) {
        descriptor.value = handler.get(target, name)
      }

      return descriptor
    }

    handler.set = (target, name) => {
      const NsError = Reflect.has(source.namespace, name)
        ? ERR_NS_ASSIGNMENT
        : ERR_NS_EXTENSION

      throw new NsError(entry.module, name)
    }
  }

  return handler
}

function createMutableNamespaceProxy(entry, source = entry) {
  return new OwnProxy(
    createNamespace(entry, source),
    createNamespaceHandler(entry, source, true)
  )
}

function createNamespaceProxy(entry, source = entry) {
  // Section 9.4.6: Module Namespace Exotic Objects
  // Namespace objects should be sealed.
  // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
  return new OwnProxy(
    Object.seal(createNamespace(entry, source)),
    createNamespaceHandler(entry, source)
  )
}

function getExportByName(entry, setter, name) {
  const { _namespace } = entry
  const isCJS = entry.type === TYPE_CJS
  const parentEntry = setter.parent
  const parentIsMJS = isMJS(parentEntry.module)
  const parentOptions = parentEntry.package.options

  const parentMutableNamespace =
    ! parentIsMJS &&
    parentOptions.cjs.mutableNamespace

  const parentNamedExports =
    entry.builtin ||
    (! parentIsMJS &&
     parentOptions.cjs.namedExports)

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

        let object = target

        if (name !== Symbol.toStringTag &&
            has(exported, name)) {
          object = exported
        }

        return Reflect.get(object, name, receiver)
      }
    })
  }

  if (name === "*") {
    if (parentMutableNamespace &&
        ! isMJS(entry.module)) {
      return noNamedExports
        ? entry.cjsMutableNamespace
        : entry.esmMutableNamespace
    }

    return noNamedExports
      ? entry.cjsNamespace
      : entry.esmNamespace
  }

  const { getters } = entry
  const mod = entry.module

  if ((noNamedExports &&
       name !== "default") ||
      (entry._loaded === LOAD_COMPLETED &&
       ! Reflect.has(getters, name))) {
    // Remove problematic setter to unblock subsequent imports.
    Reflect.deleteProperty(entry.setters, name)
    throw new ERR_EXPORT_MISSING(mod, name)
  }

  const value = tryGetter(getters[name])

  if (value === STAR_ERROR) {
    throw new ERR_EXPORT_STAR_CONFLICT(mod, name)
  }

  if (value !== GETTER_ERROR) {
    return value
  }
}

function mergeProperty(entry, otherEntry, key) {
  if (key === "cjsMutableNamespace" ||
      key === "cjsNamespace" ||
      key === "esmMutableNamespace" ||
      key === "esmNamespace") {
    return copyProperty(entry, otherEntry, key)
  }

  const value = otherEntry[key]

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
  } else if (key === "setters") {
    const settersMap = entry.setters

    for (const name in value) {
      const setters = settersMap[name]
      const newSetters = settersMap[name] = value[name]

      for (const setter of setters) {
        if (newSetters.indexOf(setter) === -1) {
          newSetters.push(setter)
        }
      }
    }
  } else if (value != null) {
    entry[key] = value
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

  const settersMap = entry.setters
  const setters = settersMap[name]

  const isLoaded = entry._loaded === LOAD_COMPLETED
  const isNs = name === "*"

  let isNsChanged = false
  let isNsLoaded = false

  try {
    if (isNs) {
      for (const setter of setters) {
        if (setter.from === "nsSetter") {
          setter(void 0, entry)
        }
      }

      isNsChanged = entry._changed
      isNsLoaded = isLoaded
    }

    for (let setter of setters) {
      const { from } = setter

      if (isNsChanged &&
          from === "nsSetter") {
        noopSetter.from = setter.from
        noopSetter.last = setter.last
        noopSetter.localNames = setter.localNames
        noopSetter.parent = setter.parent
        callback(noopSetter)
      } else {
        const value = getExportByName(entry, setter, name)

        if ((isNsLoaded &&
              from === "import") ||
            changed(setter, name, value)) {
          callback(setter, value)
        }
      }
    }
  } finally {
    entry._runningSetter = null
  }

  if (! isLoaded ||
      ! isNs) {
    return
  }

  const { length } = setters

  let i = -1

  while (++i < length) {
    if (setters[i].from === "import") {
      setters.splice(i, 1)
    }
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
