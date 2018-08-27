import ENTRY from "./constant/entry.js"

import OwnProxy from "./own/proxy.js"
import Package from "./package.js"
import SafeObject from "./safe/object.js"

import assign from "./util/assign.js"
import copyProperty from "./util/copy-property.js"
import errors from "./errors.js"
import getModuleDirname from "./util/get-module-dirname.js"
import getModuleExtname from "./util/get-module-extname.js"
import getModuleName from "./util/get-module-name.js"
import has from "./util/has.js"
import isEnumerable from "./util/is-enumerable.js"
import isObjectLike from "./util/is-object-like.js"
import isUpdatableDescriptor from "./util/is-updatable-descriptor.js"
import isUpdatableGet from "./util/is-updatable-get.js"
import keys from "./util/keys.js"
import noop from "./util/noop.js"
import proxyExports from "./util/proxy-exports.js"
import setDeferred from "./util/set-deferred.js"
import setProperty from "./util/set-property.js"
import shared from "./shared.js"
import toModuleNamespaceObject from "./util/to-module-namespace-object.js"

const {
  LOAD_COMPLETED,
  LOAD_INCOMPLETE,
  LOAD_INDETERMINATE,
  STATE_INITIAL,
  STATE_EXECUTION_COMPLETED,
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
    // The module filename.
    this._filename = null
    // The loading state of the module.
    this._loaded = LOAD_INCOMPLETE
    // The raw namespace object without proxied exports.
    this._namespace = toModuleNamespaceObject()
    // The passthru indicator for `module._compile()`.
    this._passthru = false
    // The load type for `module.require()`.
    this._require = TYPE_CJS
    // The name of the running setter.
    this._runningSetter = null
    // The initialized state of bindings imported by the module.
    this.bindings = { __proto__: null }
    // The builtin module indicator.
    this.builtin = false
    // The cache name of the module.
    this.cacheName = null
    // The child entries of the module.
    this.children = { __proto__: null }
    // The source compilation data of the module.
    this.compileData = null
    // The namespace object which may have proxied exports.
    this.namespace = this._namespace
    // The mutable namespace object CJS importers receive.
    this.cjsMutableNamespace = this.namespace
    // The namespace object CJS importers receive.
    this.cjsNamespace = this.namespace
    // The module dirname.
    this.dirname = null
    // The mutable namespace object ESM importers receive.
    this.esmMutableNamespace = this.namespace
    // The namespace object ESM importers receive.
    this.esmNamespace = this.namespace
    // The `module.exports` value at the time the module loaded.
    this.exports = mod.exports
    // The module extname.
    this.extname = null
    // The module filename.
    this.filename = null
    // Getters for local variables exported by the module.
    this.getters = { __proto__: null }
    // The unique id for the module cache.
    this.id = mod.id
    // The module the entry is managing.
    this.module = mod
    // The mtime of the module.
    this.mtime = -1
    // The name of the module.
    this.name = null
    // The package data of the module.
    this.package = Package.from(mod)
    // The `module.parent` entry.
    this.parent = null
    // The name of the runtime identifier.
    this.runtimeName = null
    // Setters for assigning to local variables in parent modules.
    this.setters = { __proto__: null }
    // Initialize empty namespace setter so they're merged properly.
    this.setters["*"] = []
    // The state of the module.
    this.state = STATE_INITIAL
    // The entry type of the module.
    this.type = TYPE_CJS

    this.updateFilename(true)
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
    const {
      _namespace,
      getters,
      type
    } = this

    const isESM = type === TYPE_ESM

    if (isESM &&
        this.compileData.exportedSpecifiers[name] === false) {
      // Skip getters for conflicted export specifiers.
      return this
    }

    const inited = Reflect.has(getters, name)

    getters[name] = getter

    if (! has(getter, "owner")) {
      getter.owner = this
    }

    if (inited) {
      return this
    }

    const descriptor = {
      configurable: true,
      enumerable: true,
      get: null,
      set: null
    }

    if (type === TYPE_CJS &&
        name === "default") {
      descriptor.get = () => this.exports

      descriptor.set = function (value) {
        setProperty(this, name, value)
      }
    } else {
      descriptor.get = () => {
        const exported = this.exports

        if (has(exported, name) &&
            isEnumerable(exported, name)) {
          return exported[name]
        }
      }

      descriptor.set = (value) => {
        this.exports[name] = value
      }
    }

    if (isESM &&
        name === "default") {
      const value = tryGetter(getter)

      // Give default exported anonymous functions the name "default".
      // https://tc39.github.io/ecma262/#sec-exports-runtime-semantics-evaluation
      if (typeof value === "function" &&
          value.name === (this.runtimeName + "anonymous")) {
        Reflect.defineProperty(value, "name", {
          configurable: true,
          enumerable: false,
          value: "default",
          writable: false
        })
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

  addGetterFrom(otherEntry, importedName, exportedName = importedName) {
    const { getters } = this
    const otherGetters = otherEntry.getters

    const getter = getters[exportedName]
    const otherGetter = otherGetters[importedName]

    if (typeof getter !== "function" &&
        typeof otherGetter === "function") {
      this.addGetter(exportedName, otherGetter)
      runGetter(this, exportedName)
    }
  }

  addGettersFrom(otherEntry) {
    const otherType = otherEntry.type

    if ((this.type === TYPE_ESM &&
         otherType !== TYPE_ESM &&
         this.extname === ".mjs") ||
        (otherType === TYPE_CJS &&
         ! otherEntry.package.options.cjs.namedExports)) {
      return this
    }

    const { getters } = this
    const otherGetters = otherEntry.getters

    this.assignExportsToNamespace()
    otherEntry.assignExportsToNamespace()

    for (const name in otherEntry._namespace) {
      if (name === "default") {
        continue
      }

      this.addGetterFrom(otherEntry, name)

      const getter = getters[name]
      const otherGetter = otherGetters[name]

      if (this.type === TYPE_ESM ||
          typeof getter !== "function" ||
          typeof otherGetter !== "function") {
        continue
      }

      const ownerName = getter.owner.name

      if (ownerName !== this.name &&
          ownerName !== otherGetter.owner.name) {
        this.addGetter(name, () => STAR_ERROR)
      }
    }

    return this
  }

  addSetter(name, localNames, setter, parent) {
    const { bindings } = this
    const settersMap = this.setters

    const setters =
      settersMap[name] ||
      (settersMap[name] = [])

    const last =
    setter.last = { __proto__: null }

    setter.localNames = localNames
    setter.parent = parent

    if (! has(setter, "type")) {
      setter.type = "static"
    }

    setters.push(setter)

    for (const name of localNames) {
      last[name] = void 0
      bindings[name] = false
    }

    return this
  }

  addSetters(argsList, parent) {
    for (const [name, localNames, setter] of argsList) {
      this.addSetter(name, localNames, setter, parent)
    }

    return this
  }

  assignExportsToNamespace(names) {
    const exported = this.exports
    const { getters } = this
    const isLoaded = this._loaded === LOAD_COMPLETED

    if (! isLoaded &&
        exported &&
        exported.__esModule &&
        this.package.options.cjs.interop) {
      this.type = TYPE_PSEUDO
    }

    const isCJS = this.type === TYPE_CJS

    if (isCJS &&
        ! Reflect.has(getters, "default")) {
      this.addGetter("default", () => this.namespace.default)
    }

    if (! isObjectLike(exported)) {
      return
    }

    if (! names) {
      names = keys(isLoaded ? this._namespace : exported)
    }

    for (const name of names) {
      if (! (isCJS &&
             name === "default") &&
          ! Reflect.has(getters, name)) {
        this.addGetter(name, () => this.namespace[name])
      }
    }
  }

  initNamespace() {
    this.initNamespace = noop

    if (this.type === TYPE_ESM) {
      const { _namespace } = this
      const { exportedSpecifiers } = this.compileData

      for (const exportedName in exportedSpecifiers) {
        if (exportedSpecifiers[exportedName] &&
            ! Reflect.has(_namespace, exportedName)) {
          _namespace[exportedName] = void 0
        }
      }
    }

    setDeferred(this, "cjsMutableNamespace", function () {
      return createMutableNamespaceProxy(
        this,
        cjsNamespaceGetter(this),
        cjsNamespaceSource(this)
      )
    })

    setDeferred(this, "cjsNamespace", function () {
      return createImmutableNamespaceProxy(
        this,
        cjsNamespaceGetter(this),
        cjsNamespaceSource(this)
      )
    })

    setDeferred(this, "esmMutableNamespace", function () {
      return createMutableNamespaceProxy(
        this,
        esmNamespaceGetter(this)
      )
    })

    setDeferred(this, "esmNamespace", function () {
      return createImmutableNamespaceProxy(
        this,
        esmNamespaceGetter(this)
      )
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

    for (const name in children) {
      if (children[name].loaded() === LOAD_INCOMPLETE) {
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
          this.extname !== ".mjs") {
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
      this.assignExportsToNamespace()
    }

    Reflect.deleteProperty(shared.entry.skipExports, this.name)

    this.initNamespace()
    this.state = STATE_EXECUTION_COMPLETED
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

  updateBindings(names) {
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
      parentsMap[id].updateBindings()
    }

    return this
  }

  updateFilename(filename, force) {
    const mod = this.module

    if (typeof filename === "boolean") {
      force = filename
      filename = void 0
    }

    if (filename !== void 0) {
      mod.filename = filename
    }

    if (force ||
        this.filename !== mod.filename) {
      this.filename = mod.filename
      this.dirname = getModuleDirname(mod)
      this.extname = getModuleExtname(mod)
      this.name = getModuleName(mod)
    }
  }
}

function assignCommonNamespaceHandlerTraps(handler, entry, source, proxy) {
  handler.get = (target, name, receiver) => {
    const { namespace } = source

    if (entry.type === TYPE_ESM) {
      const getter = entry.getters[name]

      if (getter) {
        getter()
      } else if (typeof name === "string" &&
          Reflect.has(namespace, name)) {
        throw new ERR_UNDEFINED_IDENTIFIER(name, handler.get)
      }
    }

    if (receiver === proxy) {
      receiver = namespace
    }

    return Reflect.get(namespace, name, receiver)
  }

  handler.getOwnPropertyDescriptor = (target, name) => {
    const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

    if (descriptor) {
      descriptor.value = handler.get(target, name)
    }

    return descriptor
  }

  handler.has = (target, name) => {
    return name === shared.symbol.namespace ||
      Reflect.has(source.namespace, name)
  }
}

function assignImmutableNamespaceHandlerTraps(handler, entry, source) {
  handler.defineProperty = (target, name, descriptor) => {
    if (Reflect.defineProperty(target, name, descriptor)) {
      return name === Symbol.toStringTag ||
        Reflect.has(entry.bindings, name) ||
        descriptor.value === void 0
    }

    if (Reflect.has(source.namespace, name)) {
      throw new ERR_NS_REDEFINITION(entry.module, name)
    } else {
      throw new ERR_NS_DEFINITION(entry.module, name)
    }
  }

  handler.deleteProperty = (target, name) => {
    if (Reflect.deleteProperty(target, name)) {
      return true
    }

    throw new ERR_NS_DELETION(entry.module, name)
  }

  handler.set = (target, name) => {
    if (Reflect.has(source.namespace, name)) {
      throw new ERR_NS_ASSIGNMENT(entry.module, name)
    }

    throw new ERR_NS_EXTENSION(entry.module, name)
  }
}

function assignMutableNamespaceHandlerTraps(handler, entry, source, proxy) {
  handler.defineProperty = (target, name, descriptor) => {
    SafeObject.defineProperty(entry.exports, name, descriptor)

    if (Reflect.has(source.namespace, name)) {
      entry
        .addGetter(name, () => entry.namespace[name])
        .updateBindings(name)
    }

    return true
  }

  handler.deleteProperty = (target, name) => {
    if (Reflect.deleteProperty(entry.exports, name)) {
      if (Reflect.has(source.namespace, name)) {
        entry
          .addGetter(name, () => entry.namespace[name])
          .updateBindings(name)
      }

      return true
    }

    return false
  }

  const { get } = handler

  if (typeof get === "function") {
    handler.get = (target, name, receiver) => {
      const value = Reflect.get(target, name, receiver)
      const newValue = get(target, name, receiver)

      if (newValue !== value &&
          isUpdatableGet(target, name)) {
        return newValue
      }

      return value
    }
  }

  handler.getOwnPropertyDescriptor = (target, name) => {
    const descriptor = Reflect.getOwnPropertyDescriptor(target, name)

    if (isUpdatableDescriptor(descriptor)) {
      const exported = entry.exports

      if (has(exported, name) &&
          isEnumerable(exported, name)) {
        return Reflect.getOwnPropertyDescriptor(exported, name)
      }

      descriptor.value = handler.get(target, name)
    }

    return descriptor
  }

  handler.set = (target, name, value, receiver) => {
    const exported = entry.exports

    if (receiver === proxy) {
      receiver = exported
    }

    if (Reflect.set(exported, name, value, receiver)) {
      if (Reflect.has(source.namespace, name)) {
        entry
          .addGetter(name, () => entry.namespace[name])
          .updateBindings(name)
      }

      return true
    }

    return false
  }
}

function cjsNamespaceGetter(entry) {
  return (target, name) => {
    return name === "default"
      ? target[name]
      : Reflect.getOwnPropertyDescriptor(entry.exports, name).value
  }
}

function cjsNamespaceSource(entry) {
  return {
    namespace: toModuleNamespaceObject({
      default: entry.module.exports
    })
  }
}

function createImmutableNamespaceProxy(entry, getter, source = entry) {
  // Section 9.4.6: Module Namespace Exotic Objects
  // Namespace objects should be sealed.
  // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
  const handler = initNamespaceHandler()
  const target = Object.seal(createNamespace(source, getter))
  const proxy = new OwnProxy(target, handler)

  assignCommonNamespaceHandlerTraps(handler, entry, source, proxy)
  assignImmutableNamespaceHandlerTraps(handler, entry, source)
  return proxy
}

function createNamespace(source, getter) {
  return toModuleNamespaceObject(source.namespace, getter)
}

function createMutableNamespaceProxy(entry, getter, source = entry) {
  const handler = initNamespaceHandler()
  const target = createNamespace(source, getter)
  const proxy = new OwnProxy(target, handler)

  assignCommonNamespaceHandlerTraps(handler, entry, source, proxy)
  assignMutableNamespaceHandlerTraps(handler, entry, source, proxy)
  return proxy
}

function esmNamespaceGetter(entry) {
  return (target, name) => {
    const { type } = entry

    if (type === TYPE_ESM ||
        (type === TYPE_CJS &&
         name === "default")) {
      return target[name]
    }

    return Reflect.getOwnPropertyDescriptor(entry.exports, name).value
  }
}

function getExportByName(entry, name, parentEntry) {
  const {
    _namespace,
    getters,
    type
  } = entry

  const isCJS = type === TYPE_CJS
  const isPseudo = type === TYPE_PSEUDO

  const parentOptions = parentEntry.package.options
  const parentIsMJS = parentEntry.extname === ".mjs"

  const parentMutableNamespace =
    ! parentIsMJS &&
    parentOptions.cjs.mutableNamespace

  const parentNamedExports =
    entry.builtin ||
    (! parentIsMJS &&
    parentOptions.cjs.namedExports)

  const noMutableNamespace =
    ! parentMutableNamespace ||
    entry.extname === ".mjs"

  const noNamedExports =
    (isCJS &&
     ! parentNamedExports) ||
    (isPseudo &&
     parentIsMJS)

  if (isCJS &&
      parentNamedExports &&
      entry.namespace === _namespace) {
    const proxy = new OwnProxy(_namespace, {
      get(target, name, receiver) {
        const exported = proxyExports(entry)

        if (name === "default") {
          return exported
        }

        let object = target

        if (name !== Symbol.toStringTag &&
            has(exported, name) &&
            isEnumerable(exported, name)) {
          object = exported
        }

        if (receiver === proxy) {
          receiver = object
        }

        return Reflect.get(object, name, receiver)
      }
    })

    // Lazily assign proxied namespace object.
    entry.namespace = proxy
  }

  if (name === "*") {
    if (noMutableNamespace) {
      return noNamedExports
        ? entry.cjsNamespace
        : entry.esmNamespace
    }

    return noNamedExports
      ? entry.cjsMutableNamespace
      : entry.esmMutableNamespace
  }

  if (isPseudo &&
      noNamedExports &&
      name === "default") {
    return noMutableNamespace
      ? entry.cjsNamespace.default
      : entry.cjsMutableNamespace.default
  }

  if ((noNamedExports &&
       name !== "default") ||
      (entry._loaded === LOAD_COMPLETED &&
       ! Reflect.has(getters, name))) {
    // Remove problematic setter to unblock subsequent imports.
    Reflect.deleteProperty(entry.setters, name)
    throw new ERR_EXPORT_MISSING(entry.module, name)
  }

  const getter = getters[name]

  if (getter) {
    return tryGetter(getter)
  }
}

function getExportByNameFast(entry, name) {
  const { getters } = entry

  if (entry._loaded === LOAD_COMPLETED &&
      ! Reflect.has(getters, name)) {
    // Remove problematic setter to unblock subsequent imports.
    Reflect.deleteProperty(entry.setters, name)
    throw new ERR_EXPORT_MISSING(entry.module, name)
  }

  const getter = getters[name]

  if (getter) {
    return tryGetter(getter)
  }
}

function initNamespaceHandler() {
  return {
    defineProperty: null,
    deleteProperty: null,
    get: null,
    getOwnPropertyDescriptor: null,
    has: null,
    set: null
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
  const getter = entry.getters[name]

  const value = getter
    ? tryGetter(getter)
    : GETTER_ERROR

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
    entry.assignExportsToNamespace(names)
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
        if (setter.type === "namespace") {
          setter(void 0, entry)
        }
      }

      isNsChanged = entry._changed
      isNsLoaded = isLoaded
    }

    for (let setter of setters) {
      const { type } = setter

      if (isNsChanged &&
          type === "namespace") {
        noopSetter.last = setter.last
        noopSetter.localNames = setter.localNames
        noopSetter.parent = setter.parent
        noopSetter.type = type
        callback(noopSetter)
      } else {
        let value

        if (name !== "*" &&
            entry.type === TYPE_ESM) {
          value = getExportByNameFast(entry, name)
        } else {
          value = getExportByName(entry, name, setter.parent)
        }

        if (value === GETTER_ERROR) {
          value = void 0
        } else if (value === STAR_ERROR) {
          throw new ERR_EXPORT_STAR_CONFLICT(entry.module, name)
        }

        const { last } = setter

        if ((isNsLoaded &&
             type === "dynamic") ||
            ! Object.is(last[name], value)) {
          last[name] = value
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
    if (setters[i].type === "dynamic") {
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
