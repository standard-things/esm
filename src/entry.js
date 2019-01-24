import { basename, extname, sep } from "./safe/path.js"

import COMPILER from "./constant/compiler.js"
import ENTRY from "./constant/entry.js"

import CachingCompiler from "./caching-compiler.js"
import OwnProxy from "./own/proxy.js"
import Package from "./package.js"
import SafeObject from "./safe/object.js"

import constructStackless from "./error/construct-stackless.js"
import encodeId from "./util/encode-id.js"
import errors from "./errors.js"
import getCacheName from "./util/get-cache-name.js"
import getCacheStateHash from "./util/get-cache-state-hash.js"
import getModuleDirname from "./util/get-module-dirname.js"
import getModuleName from "./util/get-module-name.js"
import getMtime from "./fs/get-mtime.js"
import getPrototypeOf from "./util/get-prototype-of.js"
import getStackFrames from "./error/get-stack-frames.js"
import has from "./util/has.js"
import isEnumerable from "./util/is-enumerable.js"
import isObject from "./util/is-object.js"
import isObjectLike from "./util/is-object-like.js"
import isOwnPath from "./util/is-own-path.js"
import isUpdatableDescriptor from "./util/is-updatable-descriptor.js"
import isUpdatableGet from "./util/is-updatable-get.js"
import isUpdatableSet from "./util/is-updatable-set.js"
import keys from "./util/keys.js"
import ownPropertyNames from "./util/own-property-names.js"
import proxyExports from "./util/proxy-exports.js"
import readFile from "./fs/read-file.js"
import setDeferred from "./util/set-deferred.js"
import setProperty from "./util/set-property.js"
import shared from "./shared.js"
import toRawModuleNamespaceObject from "./util/to-raw-module-namespace-object.js"

const {
  ERROR_GETTER,
  ERROR_STAR,
  INITIAL_VALUE,
  LOAD_COMPLETED,
  LOAD_INCOMPLETE,
  LOAD_INDETERMINATE,
  SETTER_TYPE_DYNAMIC_IMPORT,
  SETTER_TYPE_EXPORT_FROM,
  SETTER_TYPE_NAMESPACE,
  SETTER_TYPE_STATIC_IMPORT,
  STATE_INITIAL,
  STATE_EXECUTION_STARTED,
  TYPE_CJS,
  TYPE_ESM,
  TYPE_PSEUDO,
  TYPE_WASM,
  UPDATE_TYPE_DEFAULT,
  UPDATE_TYPE_INIT,
  UPDATE_TYPE_LIVE
} = ENTRY

const {
  SOURCE_TYPE_MODULE
} = COMPILER

const {
  ERR_EXPORT_STAR_CONFLICT,
  ERR_NS_ASSIGNMENT,
  ERR_NS_DEFINITION,
  ERR_NS_DELETION,
  ERR_NS_EXTENSION,
  ERR_NS_REDEFINITION,
  ERR_UNDEFINED_IDENTIFIER
} = errors

const pseudoDescriptor = {
  value: true
}

class Entry {
  constructor(mod) {
    // The namespace object change indicator.
    this._changed = false
    // The loaded state of the module.
    this._loaded = LOAD_INCOMPLETE
    // The raw mutable namespace object for CJS importers.
    this._cjsMutableNamespace = toRawModuleNamespaceObject({ default: void 0 })
    // The raw namespace object for CJS importers.
    this._cjsNamespace = toRawModuleNamespaceObject({ default: void 0 })
    // The CJS validation indicator.
    this._cjsValidated = false
    // The raw mutable namespace object for ESM importers.
    this._esmMutableNamespace = toRawModuleNamespaceObject()
    // The raw namespace object for ESM importers.
    this._esmNamespace = toRawModuleNamespaceObject()
    // The ESM validation indicator.
    this._esmValidated = false
    // The entry finalization handler.
    this._finalize = null
    // The last child entry loaded.
    this._lastChild = null
    // The raw namespace object without proxied exports.
    this._namespace = toRawModuleNamespaceObject()
    // The finalized state of the namespace object.
    this._namespaceFinalized = false
    // The passthru indicator for `module._compile()`.
    this._passthruCompile = false
    // The passthru indicator for `module.require()`.
    this._passthruRequire = false
    // The import validation cache.
    this._validation = new Map
    // The module basename.
    this.basename = null
    // The builtin module indicator.
    this.builtin = false
    // The child entries of the module.
    this.children = { __proto__: null }
    // The circular import indicator.
    this.circular = false
    // The namespace object which may have proxied exports.
    this.namespace = this._namespace
    // The module dirname.
    this.dirname = null
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
    // The initialized state of bindings imported by the module.
    this.importedBindings = { __proto__: null }
    // The module the entry is managing.
    this.module = mod
    // The name of the module.
    this.name = null
    // The package data of the module.
    this.package = Package.from(mod)
    // The paused state of the entry generator.
    this.running = false
    // The `module.parent` entry.
    this.parent = Entry.get(mod.parent)
    // The runtime object reference.
    this.runtime = null
    // Setters for assigning to local variables in parent modules.
    this.setters = { __proto__: null }
    // Initialize empty namespace setter so they're merged properly.
    this.setters["*"] = []
    // The state of the module.
    this.state = STATE_INITIAL

    // The cache name of the module.
    setDeferred(this, "cacheName", () => {
      const pkg = this.package

      return getCacheName(this.mtime, {
        cachePath: pkg.cachePath,
        filename: this.filename,
        packageOptions: pkg.options
      })
    })

    // The mutable namespace object CJS importers receive.
    setDeferred(this, "cjsMutableNamespace", () => {
      return createMutableNamespaceProxy(this, this._cjsMutableNamespace)
    })

    // The namespace object CJS importers receive.
    setDeferred(this, "cjsNamespace", () => {
      return createImmutableNamespaceProxy(this, this._cjsNamespace)
    })

    // The source compilation data of the module.
    setDeferred(this, "compileData", () => {
      const compileData = CachingCompiler.from(this)

      if (compileData !== null &&
          compileData.changed) {
        const content = readFile(this.package.cachePath + sep + this.cacheName, "utf8")
        const code = content === null ? "" : content

        compileData.code = code
        compileData.codeWithoutTDZ = code
      }

      return compileData
    })

    // The mutable namespace object ESM importers receive.
    setDeferred(this, "esmMutableNamespace", () => {
      return createMutableNamespaceProxy(this, this._esmMutableNamespace)
    })

    // The namespace object ESM importers receive.
    setDeferred(this, "esmNamespace", () => {
      return createImmutableNamespaceProxy(this, this._esmNamespace)
    })

    // The mtime of the module.
    setDeferred(this, "mtime", () => {
      return getMtime(this.filename)
    })

    // The name of the runtime identifier.
    setDeferred(this, "runtimeName", () => {
      return encodeId("_" + getCacheStateHash(this.cacheName).slice(0, 3))
    })

    // The entry type of the module.
    setDeferred(this, "type", () => {
      const { compileData } = this

      if (compileData !== null &&
          compileData.sourceType === SOURCE_TYPE_MODULE) {
        return TYPE_ESM
      }

      const proxy = new OwnProxy(this._namespace, {
        get: (_namespace, name, receiver) => {
          const exported = this.exports

          if (name === "default") {
            return exported
          }

          let object = _namespace

          if (name !== Symbol.toStringTag &&
              has(exported, name) &&
              (this.builtin ||
               isEnumerable(exported, name))) {
            object = exported
          }

          if (receiver === proxy) {
            receiver = object
          }

          return Reflect.get(object, name, receiver)
        }
      })

      this.exports = proxyExports(this)
      this.namespace = proxy

      return TYPE_CJS
    })

    this.updateFilename(true)
  }

  static get(mod) {
    if (! isObject(mod)) {
      return null
    }

    const { cache } = shared.entry

    let entry = cache.get(mod)

    if (entry === void 0) {
      entry = new Entry(mod)
    } else if (entry._loaded === LOAD_COMPLETED &&
        entry.type === TYPE_CJS) {
      const { bridged } = shared
      const exported = entry.module.exports
      const found = bridged.get(exported)

      if (found !== void 0) {
        entry = found
        bridged.delete(exported)
      }
    }

    if (entry !== void 0) {
      Entry.set(mod, entry)
    }

    return entry
  }

  static has(mod) {
    return shared.entry.cache.has(mod)
  }

  static set(mod, entry) {
    if (isObject(mod)) {
      shared.entry.cache.set(mod, entry)
    }
  }

  addGetter(name, getter) {
    const {
      _namespace,
      getters,
      type
    } = this

    getters[name] = getter

    if (! has(getter, "id")) {
      getter.id = name
    }

    if (! has(getter, "owner")) {
      getter.owner = this
    }

    const descriptor = {
      configurable: true,
      enumerable: true,
      get: null,
      set: null
    }

    const isDefault = name === "default"

    if (isDefault &&
        type === TYPE_CJS) {
      descriptor.get = () => this.exports

      descriptor.set = function (value) {
        setProperty(this, name, value)
      }
    } else {
      descriptor.get = () => {
        const exported = this.exports

        if (has(exported, name) &&
            (this.builtin ||
             isEnumerable(exported, name))) {
          return exported[name]
        }
      }

      descriptor.set = (value) => {
        this.exports[name] = value
      }
    }

    if (isDefault &&
        type === TYPE_ESM) {
      const value = tryGetter(getter)

      // Give default exported anonymous functions the name "default".
      // https://tc39.github.io/ecma262/#sec-exports-runtime-semantics-evaluation
      if (typeof value === "function" &&
          value.name === (this.runtimeName + "anonymous")) {
        Reflect.defineProperty(value, "name", {
          configurable: true,
          value: "default"
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
    if (importedName === "*") {
      return this.addGetter(exportedName, () => otherEntry.esmNamespace)
    }

    const otherGetters = otherEntry.getters

    let otherGetter = otherGetters[importedName]

    if (this.extname === ".mjs" &&
        otherEntry.type !== TYPE_ESM) {
      otherGetter = () => otherEntry.cjsNamespace[importedName]
      otherGetter.owner = otherEntry
    }

    if (otherGetter === void 0) {
      otherGetter = () => otherEntry.getters[importedName]()
      otherGetter.deferred = true
      otherGetter.id = importedName
      otherGetter.owner = otherEntry

    }

    return this.addGetter(exportedName, otherGetter)
  }

  addSetter(name, localNames, setter, parentEntry) {
    setter.last = name === "default" ? void 0 : INITIAL_VALUE
    setter.localNames = localNames
    setter.parent = parentEntry

    if (! has(setter, "type")) {
      setter.type = SETTER_TYPE_STATIC_IMPORT
    }

    const settersMap = this.setters

    if (! Reflect.has(settersMap, name)) {
      settersMap[name] = []
    }

    settersMap[name].push(setter)

    const { importedBindings } = parentEntry

    for (const name of localNames) {
      if (! Reflect.has(importedBindings, name)) {
        importedBindings[name] = false
      }
    }

    return this
  }

  addSetters(argsList, parentEntry) {
    for (const [name, localNames, setter] of argsList) {
      this.addSetter(name, localNames, setter, parentEntry)
    }

    return this
  }

  assignExportsToNamespace(names) {
    const exported = this.exports
    const { type } = this

    if ((type !== TYPE_ESM &&
         ! this.module.loaded) ||
        ! isObjectLike(exported)) {
      return
    }

    const { getters } = this
    const isLoaded = this._loaded === LOAD_COMPLETED

    if (names === void 0) {
      if (isLoaded) {
        names = keys(this._namespace)
      } else {
        names = this.builtin ? getBuiltinExportNames(exported) : keys(exported)
      }
    }

    const isCJS = type === TYPE_CJS

    for (const name of names) {
      if (! (isCJS &&
             name === "default") &&
          ! Reflect.has(getters, name)) {
        this.addGetter(name, () => this.namespace[name])
      }
    }
  }

  finalizeNamespace() {
    if (this._namespaceFinalized === true) {
      return this
    }

    this._namespaceFinalized = true

    // Table 29: Internal Slots of Module Namespace Exotic Objects
    // Properties should be assigned in `Array#sort()` order.
    // https://tc39.github.io/ecma262/#table-29
    const names = keys(this.namespace).sort()

    for (const name of names) {
      this._esmNamespace[name] = INITIAL_VALUE
      this._esmMutableNamespace[name] = INITIAL_VALUE
    }

    // Section 9.4.6: Module Namespace Exotic Objects
    // Namespace objects should be sealed.
    // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
    Object.seal(this._esmNamespace)

    if (this.type !== TYPE_ESM) {
      this._cjsNamespace.default = INITIAL_VALUE
      this._cjsMutableNamespace.default = INITIAL_VALUE
      Object.seal(this._cjsNamespace)
    }

    return this
  }

  loaded() {
    if (this._loaded !== LOAD_INCOMPLETE) {
      return this._loaded
    }

    const mod = this.module

    if (! mod.loaded) {
      return this._loaded = LOAD_INCOMPLETE
    }

    this._loaded = LOAD_INDETERMINATE

    const { children } = this

    for (const name in children) {
      if (! children[name].module.loaded) {
        return this._loaded = LOAD_INCOMPLETE
      }
    }

    const isWASM = this.type === TYPE_WASM

    if (isWASM ||
        this.type === TYPE_ESM) {
      const exported = this.exports
      const names = isWASM ? keys(exported) : void 0

      this._loaded = LOAD_COMPLETED
      this.namespace = this._namespace
      this.assignExportsToNamespace(names)

      if (this.package.options.cjs.interop &&
          this.extname !== ".mjs" &&
          ! Reflect.has(this.getters, "__esModule")) {
        Reflect.defineProperty(exported, "__esModule", pseudoDescriptor)
      }
    } else {
      const exported = mod.exports

      if (exported != null &&
          exported.__esModule &&
          this.type === TYPE_CJS &&
          this.package.options.cjs.interop) {
        this.namespace = this._namespace
        this.type = TYPE_PSEUDO
      }

      this.exports = exported
      this._loaded = LOAD_COMPLETED

      if (this.type === TYPE_CJS) {
        if (! Reflect.has(this.getters, "default")) {
          this.addGetter("default", () => this.namespace.default)
        }

        this.exports = proxyExports(this)
      }

      this.assignExportsToNamespace(keys(exported))
    }

    this.finalizeNamespace()

    return this._loaded
  }

  resumeChildren() {
    const { children } = this

    for (const name in children) {
      const childEntry = children[name]

      if (childEntry.running === true) {
        continue
      }

      const { runtime } = childEntry

      if (runtime !== null &&
          runtime._runResult !== void 0 &&
          childEntry.state < STATE_EXECUTION_STARTED) {
        childEntry.running = true
        runtime._runResult.next()
        childEntry.running = false
        childEntry.module.loaded = true
      }

      if (typeof childEntry._finalize === "function") {
        childEntry._finalize()
      } else {
        childEntry.loaded()
        childEntry.updateBindings(null, UPDATE_TYPE_INIT)
      }
    }
  }

  updateBindings(names, updateType = UPDATE_TYPE_DEFAULT, seen) {
    const shouldUpdateParents =
      this.circular ||
      updateType === UPDATE_TYPE_LIVE ||
      updateType === UPDATE_TYPE_INIT

    if (shouldUpdateParents &&
        seen !== void 0 &&
        seen.has(this)) {
      return this
    }

    if (typeof names === "string") {
      names = [names]
    }

    // Lazily-initialized map of parent module names to parent entries whose
    // setters might need to run.
    let parentsMap

    this._changed = false

    runGetters(this, names)
    runSetters(this, names, (setter) => {
      const parentEntry = setter.parent
      const { importedBindings } = parentEntry

      if (setter.last !== ERROR_GETTER) {
        for (const name of setter.localNames) {
          importedBindings[name] = true
        }
      }

      if (shouldUpdateParents) {
        if (parentsMap === void 0) {
          parentsMap = { __proto__: null }
        }

        parentsMap[parentEntry.name] = parentEntry
      }
    }, updateType)

    this._changed = false

    if (parentsMap === void 0) {
      return this
    }

    let parentUpdateType = updateType

    if (parentUpdateType !== UPDATE_TYPE_DEFAULT) {
      parentUpdateType = UPDATE_TYPE_LIVE
    }

    if (seen === void 0) {
      seen = new Set
    }

    seen.add(this)

    // If any of the setters updated the bindings of a parent module,
    // or updated local variables that are exported by that parent module,
    // then we must re-run any setters registered by that parent module.
    for (const id in parentsMap) {
      const parentEntry = parentsMap[id]

      parentEntry.loaded()
      parentEntry.updateBindings(null, parentUpdateType, seen)
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

    if (! force &&
        this.filename === mod.filename) {
      return this
    }

    const modDirname = getModuleDirname(mod)
    const modFilename = mod.filename

    this.dirname = modDirname
    this.filename = modFilename
    this.name = getModuleName(mod)

    if (modDirname === "") {
      this.basename = modFilename
      this.extname = ""
    } else if (typeof modFilename !== "string") {
      this.basename = ""
      this.extname = ""
    } else {
      this.basename = modDirname === "."
        ? basename(modFilename)
        : modFilename.slice(modDirname.length + 1)

      this.extname = extname(modFilename)
    }

    return this
  }
}

function assignCommonNamespaceHandlerTraps(handler, entry, proxy) {
  handler.get = function get(namespace, name, receiver) {
    const { getters } = entry
    const isESM = entry.type === TYPE_ESM

    let errored

    if (isESM) {
      errored =
        ! Reflect.has(getters, name) ||
        getters[name]() === ERROR_GETTER
    } else {
      errored = entry._loaded !== LOAD_COMPLETED
    }

    if (errored &&
        typeof name === "string" &&
        Reflect.has(namespace, name)) {
      throw new ERR_UNDEFINED_IDENTIFIER(name, get)
    }

    if (! isESM &&
        name === "default" &&
        (namespace === entry._cjsNamespace ||
         namespace === entry._cjsMutableNamespace)) {
      return entry.exports
    }

    const object = entry.namespace

    if (receiver === proxy) {
      receiver = object
    }

    return Reflect.get(object, name, receiver)
  }

  handler.getOwnPropertyDescriptor = (namespace, name) => {
    const descriptor = Reflect.getOwnPropertyDescriptor(namespace, name)

    if (descriptor) {
      descriptor.value = handler.get(entry.namespace, name)
    }

    return descriptor
  }

  handler.has = (namespace, name) => {
    return name === shared.symbol.namespace ||
      Reflect.has(namespace, name)
  }
}

function assignImmutableNamespaceHandlerTraps(handler, entry) {
  "use sloppy"

  handler.defineProperty = (namespace, name, descriptor) => {
    if (! (descriptor.writable === false &&
           ! Reflect.has(descriptor, "value") &&
           Reflect.has(namespace, name)) &&
        Reflect.defineProperty(namespace, name, descriptor)) {
      return name === Symbol.toStringTag ||
        Reflect.has(entry.importedBindings, name) ||
        descriptor.value === void 0
    }

    if (! isCalledFromStrictCode()) {
      return false
    }

    if (Reflect.has(namespace, name)) {
      throw new ERR_NS_REDEFINITION(entry.module, name)
    } else {
      throw new ERR_NS_DEFINITION(entry.module, name)
    }
  }

  handler.deleteProperty = (namespace, name) => {
    if (Reflect.deleteProperty(namespace, name)) {
      return true
    }

    if (! isCalledFromStrictCode()) {
      return false
    }

    throw new ERR_NS_DELETION(entry.module, name)
  }

  handler.set = (namespace, name) => {
    if (! isCalledFromStrictCode()) {
      return false
    }

    if (Reflect.has(namespace, name)) {
      throw new ERR_NS_ASSIGNMENT(entry.module, name)
    }

    throw new ERR_NS_EXTENSION(entry.module, name)
  }
}

function assignMutableNamespaceHandlerTraps(handler, entry, proxy) {
  handler.defineProperty = (namespace, name, descriptor) => {
    SafeObject.defineProperty(entry.exports, name, descriptor)

    if (Reflect.has(namespace, name)) {
      entry.addGetter(name, () => entry.namespace[name])
      entry.updateBindings(name)
    }

    return true
  }

  handler.deleteProperty = (namespace, name) => {
    if (Reflect.deleteProperty(entry.exports, name)) {
      if (Reflect.has(namespace, name)) {
        entry.addGetter(name, () => entry.namespace[name])
        entry.updateBindings(name)
      }

      return true
    }

    return false
  }

  const { get } = handler

  if (typeof get === "function") {
    handler.get = (namespace, name, receiver) => {
      const value = Reflect.get(namespace, name, receiver)
      const newValue = get(namespace, name, receiver)

      if ((value === INITIAL_VALUE ||
           newValue !== value) &&
          isUpdatableGet(namespace, name)) {
        return newValue
      }

      return value
    }
  }

  handler.getOwnPropertyDescriptor = (namespace, name) => {
    const descriptor = Reflect.getOwnPropertyDescriptor(namespace, name)

    if (! isUpdatableDescriptor(descriptor)) {
      return descriptor
    }

    const exported = entry.exports

    let value

    if (has(exported, name) &&
        (entry.builtin ||
         isEnumerable(exported, name))) {
      const exportedDescriptor = Reflect.getOwnPropertyDescriptor(exported, name)
      const exportedGet = exportedDescriptor.get

      value = typeof exportedGet === "function"
        ? tryGetter(exportedGet)
        : exportedDescriptor.value
    } else {
      value = handler.get(namespace, name)
    }

    if (value !== ERROR_GETTER) {
      descriptor.value = value
    }

    return descriptor
  }

  handler.set = (namespace, name, value, receiver) => {
    const exported = entry.exports

    if (receiver === proxy) {
      receiver = exported
    }

    if (! isUpdatableSet(exported, name)) {
      exported[name] = value
      return false
    }

    if (Reflect.set(exported, name, value, receiver)) {
      if (Reflect.has(entry.namespace, name)) {
        entry.addGetter(name, () => entry.namespace[name])
        entry.updateBindings(name)
      }

      return true
    }

    return false
  }
}

function createImmutableNamespaceProxy(entry, namespace) {
  // Section 9.4.6: Module Namespace Exotic Objects
  // Namespace objects should be sealed.
  // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
  const handler = initNamespaceHandler()
  const proxy = new OwnProxy(namespace, handler)

  assignCommonNamespaceHandlerTraps(handler, entry, proxy)
  assignImmutableNamespaceHandlerTraps(handler, entry)
  return proxy
}

function createMutableNamespaceProxy(entry, namespace) {
  const handler = initNamespaceHandler()
  const proxy = new OwnProxy(namespace, handler)

  assignCommonNamespaceHandlerTraps(handler, entry, proxy)
  assignMutableNamespaceHandlerTraps(handler, entry, proxy)
  return proxy
}

function getBuiltinExportNames(exported) {
  const names = []
  const possibleNames = ownPropertyNames(exported)
  const proto = getPrototypeOf(exported)

  for (const name of possibleNames) {
    if (! isEnumerable(exported, name) &&
        Reflect.has(proto, name) &&
        ! isEnumerable(proto, name)) {
      continue
    }

    names.push(name)
  }

  return names
}

function getExportByName(entry, name, parentEntry) {
  const { type } = entry
  const isCJS = type === TYPE_CJS

  const parentCJS = parentEntry.package.options.cjs
  const parentIsMJS = parentEntry.extname === ".mjs"

  const parentMutableNamespace =
    ! parentIsMJS &&
    parentCJS.mutableNamespace

  const parentNamedExports =
    ! parentIsMJS &&
    parentCJS.namedExports

  const noMutableNamespace =
    ! parentMutableNamespace ||
    entry.extname === ".mjs"

  const noNamedExports =
    ! entry.builtin &&
    ((isCJS &&
      ! parentNamedExports) ||
     (parentIsMJS &&
      type !== TYPE_ESM))

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

  if (! isCJS &&
      noNamedExports &&
      name === "default") {
    return noMutableNamespace
      ? entry.cjsNamespace.default
      : entry.cjsMutableNamespace.default
  }

  const { getters } = entry

  return Reflect.has(getters, name)
    ? tryGetter(getters[name])
    : ERROR_GETTER
}

function getExportByNameFast(entry, name, parentEntry) {
  if (name !== "*") {
    const { getters } = entry

    return Reflect.has(getters, name)
      ? tryGetter(getters[name])
      : ERROR_GETTER
  }

  const parentMutableNamespace =
    parentEntry.extname !== ".mjs" &&
    parentEntry.package.options.cjs.mutableNamespace

  const noMutableNamespace =
    ! parentMutableNamespace ||
    entry.extname === ".mjs"

  return noMutableNamespace
    ? entry.esmNamespace
    : entry.esmMutableNamespace
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

function isCalledFromStrictCode() {
  "use sloppy"

  const frames = getStackFrames(new Error)

  for (const frame of frames) {
    const filename = frame.getFileName()

    if (filename &&
        ! isOwnPath(filename) &&
        ! frame.isNative()) {
      return frame.getFunction() === void 0
    }
  }

  return false
}

function runGetter(entry, name) {
  const { _namespace } = entry
  const value = tryGetter(entry.getters[name])

  if (value === ERROR_STAR) {
    Reflect.deleteProperty(_namespace, name)
  } else if (! Reflect.has(_namespace, name) ||
      ! Object.is(_namespace[name], value)) {
    entry._changed = true
    _namespace[name] = value
  }
}

function runGetters(entry, names) {
  if (entry.type === TYPE_ESM) {
    if (Array.isArray(names)) {
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

function runSetter(entry, name, callback, updateType) {
  const setters = entry.setters[name]

  if (! setters) {
    return
  }

  const isESM = entry.type === TYPE_ESM
  const isLoaded = entry._loaded === LOAD_COMPLETED
  const isNsChanged = entry._changed

  let { length } = setters

  while (length--) {
    const setter = setters[length]
    const parentEntry = setter.parent

    const value = isESM
      ? getExportByNameFast(entry, name, parentEntry)
      : getExportByName(entry, name, parentEntry)

    if (value === ERROR_STAR) {
      setters.splice(length, 1)
      throw constructStackless(ERR_EXPORT_STAR_CONFLICT, [entry.module, name])
    }

    const { type } = setter
    const changed = type !== SETTER_TYPE_DYNAMIC_IMPORT && ! Object.is(setter.last, value)
    const isDynamicImport = isLoaded && type === SETTER_TYPE_DYNAMIC_IMPORT
    const isExportFrom = type === SETTER_TYPE_EXPORT_FROM
    const isExportNs = isNsChanged && type === SETTER_TYPE_NAMESPACE
    const isInit = updateType === UPDATE_TYPE_INIT

    if (changed ||
        isDynamicImport ||
        isExportFrom ||
        isExportNs ||
        isInit) {
      setter.last = value

      const setterValue = value === ERROR_GETTER ? void 0 : value
      const result = setter(setterValue, entry)

      if (result) {
        if (isDynamicImport) {
          setters.splice(length, 1)
        }
      } else if (isExportFrom &&
          ! changed) {
        continue
      }

      callback(setter)
    }
  }
}

function runSetters(entry, names, callback, updateType) {
  if (Array.isArray(names)) {
    for (const name of names) {
      runSetter(entry, name, callback, updateType)
    }
  } else {
    for (const name in entry.setters) {
      runSetter(entry, name, callback, updateType)
    }
  }
}

function tryGetter(getter) {
  try {
    return getter()
  } catch {}

  return ERROR_GETTER
}

Reflect.setPrototypeOf(Entry.prototype, null)

export default Entry
