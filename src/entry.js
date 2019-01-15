import { basename, extname, sep } from "./safe/path.js"

import COMPILER from "./constant/compiler.js"
import ENTRY from "./constant/entry.js"

import CachingCompiler from "./caching-compiler.js"
import OwnProxy from "./own/proxy.js"
import Package from "./package.js"
import SafeObject from "./safe/object.js"

import assign from "./util/assign.js"
import constructStackless from "./error/construct-stackless.js"
import copyProperty from "./util/copy-property.js"
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
  TYPE_CJS,
  TYPE_ESM,
  TYPE_PSEUDO,
  TYPE_WASM,
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
    // The raw mutable namespace object for ESM importers.
    this._esmMutableNamespace = toRawModuleNamespaceObject()
    // The raw namespace object for ESM importers.
    this._esmNamespace = toRawModuleNamespaceObject()
    // The raw namespace object without proxied exports.
    this._namespace = toRawModuleNamespaceObject()
    // The finalized state of the namespace object.
    this._namespaceFinalized = false
    // The passthru indicator for `module._compile()`.
    this._passthruCompile = false
    // The passthru indicator for `module.require()`.
    this._passthruRequire = false
    // The module basename.
    this.basename = null
    // The builtin module indicator.
    this.builtin = false
    // The child entries of the module.
    this.children = { __proto__: null }
    // The circular import indicator.
    this.circular = false
    // The mutable namespace object CJS importers receive.
    this.cjsMutableNamespace = createMutableNamespaceProxy(this, this._cjsMutableNamespace)
    // The namespace object CJS importers receive.
    this.cjsNamespace = createImmutableNamespaceProxy(this, this._cjsNamespace)
    // The mutable namespace object ESM importers receive.
    this.esmMutableNamespace = createMutableNamespaceProxy(this, this._esmMutableNamespace)
    // The namespace object ESM importers receive.
    this.esmNamespace = createImmutableNamespaceProxy(this, this._esmNamespace)
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
    this.parent = null
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
      const {
        cachePath,
        options:packageOptions
      } = this.package

      return getCacheName(this.mtime, {
        cachePath,
        filename: this.filename,
        packageOptions
      })
    })

    // The source compilation data of the module.
    setDeferred(this, "compileData", () => {
      const { cacheName } = this
      const { cache, cachePath } = this.package
      const compileData = CachingCompiler.from(this)

      if (compileData === null) {
        Reflect.deleteProperty(cache.compile, cacheName)
      } else if (compileData.changed) {
        const content = readFile(cachePath + sep + cacheName, "utf8")

        compileData.code =
        compileData.codeWithoutTDZ = content === null ? "" : content
      }

      return compileData
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

  static delete(value) {
    shared.entry.cache.delete(value)
  }

  static get(mod) {
    if (! isObject(mod)) {
      return null
    }

    const { cache, skipExports } = shared.entry
    const name = getModuleName(mod)

    let exported
    let useExports = false

    if (! skipExports.has(name)) {
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
      otherGetter.owner = otherEntry
      otherGetter.id = importedName
      otherGetter.deferred = true
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
      this._esmNamespace[name] =
      this._esmMutableNamespace[name] = INITIAL_VALUE
    }

    // Section 9.4.6: Module Namespace Exotic Objects
    // Namespace objects should be sealed.
    // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
    Object.seal(this._esmNamespace)

    if (this.type !== TYPE_ESM) {
      this._cjsNamespace.default =
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

    if (this.type === TYPE_ESM ||
        this.type === TYPE_WASM) {
      this._loaded = LOAD_COMPLETED
      this.assignExportsToNamespace()

      if (this.package.options.cjs.interop &&
          this.extname !== ".mjs" &&
          ! Reflect.has(this.getters, "__esModule")) {
        Reflect.defineProperty(this.exports, "__esModule", pseudoDescriptor)
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

      if (newExported != null &&
          newExported.__esModule &&
          this.type === TYPE_CJS &&
          this.package.options.cjs.interop) {
        this.namespace = this._namespace
        this.type = TYPE_PSEUDO
      }

      this.exports = newExported
      this._loaded = LOAD_COMPLETED

      if (this.type === TYPE_CJS) {
        if (! Reflect.has(this.getters, "default")) {
          this.addGetter("default", () => this.namespace.default)
        }

        this.exports = proxyExports(this)
      }

      this.assignExportsToNamespace(keys(newExported))
      shared.entry.skipExports.delete(this.name)
    }

    this.finalizeNamespace()

    return this._loaded
  }

  merge(otherEntry) {
    if (otherEntry !== this) {
      for (const name in otherEntry) {
        mergeProperty(this, otherEntry, name)
      }
    }

    return this
  }

  resumeChildren() {
    const { children } = this

    for (const name in children) {
      const childEntry = children[name]

      if (childEntry.running === false) {
        const { runtime } = childEntry

        if (runtime !== null &&
            runtime._runResult !== void 0 &&
            childEntry.module !== this.module &&
            childEntry._loaded !== LOAD_COMPLETED) {
          childEntry.running = true
          runtime._runResult.next()
          childEntry.running = false
          childEntry.module.loaded = true
        }

        if (childEntry.done) {
          childEntry.done()
        } else {
          childEntry.loaded()
          childEntry.updateBindings(null, UPDATE_TYPE_INIT)
        }
      }
    }
  }

  updateBindings(names, type, seen) {
    const shouldUpdateParents =
      this.circular ||
      type === UPDATE_TYPE_INIT ||
      type === UPDATE_TYPE_LIVE

    if (shouldUpdateParents) {
      if (seen !== void 0 &&
        seen.has(this)) {
        return
      } else if (seen === void 0) {
        seen = new Set
      }

      seen.add(this)
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
    }, type)

    this._changed = false

    // If any of the setters updated the bindings of a parent module,
    // or updated local variables that are exported by that parent module,
    // then we must re-run any setters registered by that parent module.
    if (shouldUpdateParents) {
      for (const id in parentsMap) {
        const parentEntry = parentsMap[id]

        parentEntry.loaded()
        parentEntry.updateBindings(null, UPDATE_TYPE_LIVE, seen)
      }
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
      return
    }

    const modDirname = getModuleDirname(mod)
    const modFilename = mod.filename

    this.dirname = modDirname
    this.filename = modFilename
    this.name = getModuleName(mod)

    if (modDirname === "") {
      this.basename = modFilename
      this.extname = ""
      return
    }

    if (typeof modFilename !== "string") {
      this.basename =
      this.extname = ""
      return
    }

    this.basename = modDirname === "."
      ? basename(modFilename)
      : modFilename.slice(modDirname.length + 1)

    this.extname = extname(modFilename)
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
    if (Reflect.defineProperty(namespace, name, descriptor)) {
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

    if (isUpdatableDescriptor(descriptor)) {
      const exported = entry.exports

      if (has(exported, name) &&
          (entry.builtin ||
           isEnumerable(exported, name))) {
        const exportDescriptor = Reflect.getOwnPropertyDescriptor(exported, name)

        // Section 9.5.5: [[GetOwnProperty]]()
        // Step 17: Throw a type error if the target descriptor is configurable
        // but the resulting descriptor is not.
        // https://tc39.github.io/ecma262/#sec-proxy-object-internal-methods-and-internal-slots-getownproperty-p
        exportDescriptor.configurable = descriptor.configurable
        return exportDescriptor
      }

      descriptor.value = handler.get(namespace, name)
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

  const getter = entry.getters[name]

  if (typeof getter === "function") {
    return getter()
  }
}

function getExportByNameFast(entry, name, parentEntry) {
  if (name !== "*") {
    return tryGetter(entry.getters[name])
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
  } else if (key === "exports") {
    entry[key] = value
  } else if (key === "getters") {
    for (const name in value) {
      entry.addGetter(name, value[name])
    }
  } else if (key === "setters") {
    const settersMap = entry[key]

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

  const value = typeof getter === "function"
    ? tryGetter(getter)
    : ERROR_GETTER

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

    let value

    if (isESM) {
      value = getExportByNameFast(entry, name, parentEntry)
    } else {
      value = getExportByName(entry, name, parentEntry)
    }

    if (value === ERROR_STAR) {
      setters.splice(length, 1)
      throw constructStackless(ERR_EXPORT_STAR_CONFLICT, [entry.module, name])
    }

    const { last, type } = setter
    const changed = type !== SETTER_TYPE_DYNAMIC_IMPORT && ! Object.is(last, value)
    const isDynamicImport = isLoaded && type === SETTER_TYPE_DYNAMIC_IMPORT
    const isExportFrom = type === SETTER_TYPE_EXPORT_FROM
    const isExportNs = isNsChanged && type === SETTER_TYPE_NAMESPACE
    const isInit = updateType === UPDATE_TYPE_INIT

    if (changed ||
        isInit ||
        isDynamicImport ||
        isExportFrom ||
        isExportNs) {
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
  if (typeof getter === "function") {
    try {
      return getter()
    } catch {}
  }

  return ERROR_GETTER
}

Reflect.setPrototypeOf(Entry.prototype, null)

export default Entry
