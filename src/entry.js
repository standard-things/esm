import { basename, extname, sep } from "./safe/path.js"

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
import isDescriptorMatch from "./util/is-descriptor-match.js"
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
import shared from "./shared.js"
import toRawModuleNamespaceObject from "./util/to-raw-module-namespace-object.js"
import validateShallow from "./module/esm/validate-shallow.js"

const {
  ERROR_GETTER,
  ERROR_STAR,
  GETTER_TYPE_DEFAULT,
  GETTER_TYPE_STAR_CONFLICT,
  INITIAL_VALUE,
  LOAD_COMPLETED,
  LOAD_INCOMPLETE,
  LOAD_INDETERMINATE,
  NAMESPACE_FINALIZATION_COMPLETED,
  NAMESPACE_FINALIZATION_INCOMPLETE,
  SETTER_TYPE_DEFAULT,
  SETTER_TYPE_DYNAMIC_IMPORT,
  SETTER_TYPE_EXPORT_FROM,
  SETTER_TYPE_NAMESPACE,
  STATE_INITIAL,
  STATE_EXECUTION_COMPLETED,
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
    // The raw mutable namespace object for ESM importers.
    this._completeMutableNamespace = toRawModuleNamespaceObject()
    // The raw namespace object for ESM importers.
    this._completeNamespace = toRawModuleNamespaceObject()
    // The entry finalization handler.
    this._finalize = null
    // The last child entry loaded.
    this._lastChild = null
    // The loaded state of the module.
    this._loaded = LOAD_INCOMPLETE
    // The finalized state of the namespace object.
    this._namespaceFinalized = NAMESPACE_FINALIZATION_INCOMPLETE
    // The raw mutable namespace object for non-ESM importers.
    this._partialMutableNamespace = toRawModuleNamespaceObject({ default: INITIAL_VALUE })
    // The raw namespace object for non-ESM importers.
    this._partialNamespace = toRawModuleNamespaceObject({ default: INITIAL_VALUE })
    // The passthru indicator for `module._compile()`.
    this._passthruCompile = false
    // The passthru indicator for `module.require()`.
    this._passthruRequire = false
    // The import validation cache.
    this._validation = new Map([["*", true]])
    // The module basename.
    this.basename = null
    // The builtin module indicator.
    this.builtin = false
    // The child entries of the module.
    this.children = { __proto__: null }
    // The circular import indicator.
    this.circular = false
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
    this.importedBindings = new Map
    // The module the entry is managing.
    this.module = mod
    // The name of the module.
    this.name = null
    // The package data of the module.
    this.package = Package.from(mod)
    // The paused state of the entry generator.
    this.running = false
    // The runtime object reference.
    this.runtime = null
    // Setters for assigning to local variables in parent modules.
    this.setters = { __proto__: null }
    // Initialize empty namespace setter so they're merged properly.
    this.setters["*"] = []
    // The state of the module.
    this.state = mod.loaded ? STATE_EXECUTION_COMPLETED : STATE_INITIAL
    // The entry type of the module.
    this.type = TYPE_CJS

    // The cache name of the module.
    setDeferred(this, "cacheName", () => {
      const pkg = this.package

      return getCacheName(this.mtime, {
        cachePath: pkg.cachePath,
        filename: this.filename,
        packageOptions: pkg.options
      })
    })

    // The source compilation data of the module.
    setDeferred(this, "compileData", () => {
      const compileData = CachingCompiler.from(this)

      if (compileData !== null &&
          compileData.transforms !== 0) {
        const content = readFile(this.package.cachePath + sep + this.cacheName, "utf8")

        compileData.code = content === null ? "" : content
      }

      return compileData
    })

    // The mutable namespace object that ESM importers receive.
    setDeferred(this, "completeMutableNamespace", () => {
      return createMutableNamespaceProxy(this, this._completeMutableNamespace)
    })

    // The namespace object that ESM importers receive.
    setDeferred(this, "completeNamespace", () => {
      return createImmutableNamespaceProxy(this, this._completeNamespace)
    })

    // The mtime of the module.
    setDeferred(this, "mtime", () => {
      return getMtime(this.filename)
    })

    // The mutable namespace object that non-ESM importers receive.
    setDeferred(this, "partialMutableNamespace", () => {
      return createMutableNamespaceProxy(this, this._partialMutableNamespace)
    })

    // The namespace object that non-ESM importers receive.
    setDeferred(this, "partialNamespace", () => {
      return createImmutableNamespaceProxy(this, this._partialNamespace)
    })

    // The name of the runtime identifier.
    setDeferred(this, "runtimeName", () => {
      return encodeId("_" + getCacheStateHash(this.cacheName).slice(0, 3))
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
    } else if (entry.type === TYPE_CJS &&
               entry._loaded === LOAD_COMPLETED) {
      const { bridged } = shared
      const exported = entry.module.exports
      const foundEntry = bridged.get(exported)

      if (foundEntry !== void 0) {
        entry = foundEntry
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
    if (! has(getter, "id")) {
      getter.id = name
    }

    if (! has(getter, "owner")) {
      getter.owner = this
    }

    if (! has(getter, "type")) {
      getter.type = GETTER_TYPE_DEFAULT
    }

    if (this.type === TYPE_ESM &&
        name === "default") {
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

    this.getters[name] = getter

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
      return this.addGetter(exportedName, () => otherEntry.getExportByName("*", this))
    }

    const otherGetters = otherEntry.getters

    let otherGetter = otherGetters[importedName]

    if (otherEntry.type !== TYPE_ESM &&
        this.extname === ".mjs") {
      otherGetter = () => otherEntry.partialNamespace[importedName]
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
    setter.last = INITIAL_VALUE
    setter.localNames = localNames
    setter.owner = parentEntry

    if (! has(setter, "exportedName")) {
      setter.exportedName = null
    }

    if (! has(setter, "type")) {
      setter.type = SETTER_TYPE_DEFAULT
    }

    const settersMap = this.setters

    if (! Reflect.has(settersMap, name)) {
      settersMap[name] = []
    }

    settersMap[name].push(setter)

    const { importedBindings } = parentEntry

    for (const name of localNames) {
      if (! importedBindings.has(name)) {
        importedBindings.set(name, false)
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
    if (! isObjectLike(this.exports)) {
      return
    }

    if (names === void 0) {
      names = this._loaded === LOAD_COMPLETED
        ? keys(this.getters)
        : getExportsObjectKeys(this)
    }

    const { getters } = this
    const isCJS = this.type === TYPE_CJS

    for (const name of names) {
      if (! (isCJS &&
             name === "default") &&
          ! Reflect.has(getters, name)) {
        this.addGetter(name, () => this.exports[name])
      }
    }
  }

  finalizeNamespace() {
    if (this._namespaceFinalized === NAMESPACE_FINALIZATION_COMPLETED) {
      return this
    }

    this._namespaceFinalized = NAMESPACE_FINALIZATION_COMPLETED

    // Table 29: Internal Slots of Module Namespace Exotic Objects
    // Properties should be assigned in `Array#sort()` order.
    // https://tc39.github.io/ecma262/#table-29
    const { getters } = this
    const names = keys(getters).sort()

    for (const name of names) {
      if (getters[name].type !== GETTER_TYPE_STAR_CONFLICT) {
        this._completeMutableNamespace[name] = INITIAL_VALUE
        this._completeNamespace[name] = INITIAL_VALUE
      }
    }

    // Section 9.4.6: Module Namespace Exotic Objects
    // Namespace objects should be sealed.
    // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
    Object.seal(this._completeNamespace)

    if (this.type === TYPE_ESM) {
      return this
    }

    if (this.builtin) {
      const names = keys(this.exports)

      names.push("default")
      names.sort()

      Reflect.deleteProperty(this._partialMutableNamespace, "default")
      Reflect.deleteProperty(this._partialNamespace, "default")

      for (const name of names) {
        this._partialMutableNamespace[name] = INITIAL_VALUE
        this._partialNamespace[name] = INITIAL_VALUE
      }
    }

    Object.seal(this._partialNamespace)

    return this
  }

  getExportByName(name, parentEntry) {
    return this.type === TYPE_ESM
      ? getExportByNameFast(this, name, parentEntry)
      : getExportByName(this, name, parentEntry)
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

    const { cjs } = this.package.options

    if (this.type === TYPE_CJS) {
      let exported = mod.exports

      this._loaded = LOAD_COMPLETED

      if (cjs.esModule &&
          exported != null &&
          exported.__esModule) {
        this.type = TYPE_PSEUDO
      }

      const names = getExportsObjectKeys(this, exported)

      if (this.type === TYPE_CJS) {
        this.addGetter("default", () => this.exports)
        exported = proxyExports(this)
      }

      this.exports = exported
      this.assignExportsToNamespace(names)
    } else {
      const names = getExportsObjectKeys(this)

      this._loaded = LOAD_COMPLETED
      this.assignExportsToNamespace(names)

      if (this.extname !== ".mjs") {
        const exportDefaultOnly =
          cjs.esModule &&
          names.length === 1 &&
          names[0] === "default"

        if (cjs.mutableNamespace &&
            ! exportDefaultOnly) {
          this.module.exports = proxyExports(this)
        }

        const exported = this.exports

        if (cjs.dedefault &&
            exportDefaultOnly) {
          this.module.exports = exported.default
        } else if (cjs.esModule &&
                   ! Reflect.has(this.getters, "__esModule")) {
          Reflect.defineProperty(exported, "__esModule", pseudoDescriptor)
        }
      }
    }

    this.finalizeNamespace()

    return this._loaded
  }

  resumeChildren() {
    const { children } = this

    for (const name in children) {
      const childEntry = children[name]

      if (childEntry.running) {
        continue
      }

      const { runtime } = childEntry

      if (runtime !== null &&
          runtime._runResult !== void 0 &&
          childEntry.state < STATE_EXECUTION_STARTED) {
        childEntry.state = STATE_EXECUTION_STARTED
        childEntry.running = true
        runtime._runResult.next()
        childEntry.running = false
        childEntry.module.loaded = true
        childEntry.state = STATE_EXECUTION_COMPLETED
      }

      if (typeof childEntry._finalize === "function") {
        childEntry._finalize()
      } else {
        childEntry.loaded()
        childEntry.updateBindings(null, UPDATE_TYPE_INIT)

        validateShallow(childEntry, this)
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

    // Lazily initialize set of parent entries whose setters might need to run.
    let parentEntries

    this._changed = false

    runGetters(this, names)
    runSetters(this, names, (setter) => {
      const parentEntry = setter.owner
      const { importedBindings } = parentEntry

      if (setter.last !== ERROR_GETTER) {
        for (const name of setter.localNames) {
          importedBindings.set(name, true)
        }
      }

      if (shouldUpdateParents) {
        if (parentEntries === void 0) {
          parentEntries = new Set
        }

        parentEntries.add(parentEntry)
      }
    }, updateType)

    this._changed = false

    if (parentEntries === void 0) {
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
    parentEntries.forEach((parentEntry) => {
      parentEntry.loaded()
      parentEntry.updateBindings(null, parentUpdateType, seen)
    })

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
  handler.get = (namespace, name, receiver) => {
    const { getters, type } = entry

    let errored = entry._namespaceFinalized !== NAMESPACE_FINALIZATION_COMPLETED

    if (! errored &&
        entry.type === TYPE_ESM) {
      errored =
        ! Reflect.has(getters, name) ||
        getters[name]() === ERROR_GETTER
    }

    if (errored &&
        typeof name === "string" &&
        Reflect.has(namespace, name)) {
      throw new ERR_UNDEFINED_IDENTIFIER(name, handler.get)
    }

    if (type === TYPE_PSEUDO &&
        name === "default" &&
        namespace === entry._partialNamespace) {
      // Treat like CJS within `.mjs` files.
      return entry.exports
    }

    if (Reflect.has(getters, name)) {
      return getters[name]()
    }

    if (receiver === proxy) {
      receiver = namespace
    }

    return Reflect.get(namespace, name, receiver)
  }

  handler.getOwnPropertyDescriptor = (namespace, name) => {
    const descriptor = Reflect.getOwnPropertyDescriptor(namespace, name)

    if (descriptor !== void 0) {
      descriptor.value = handler.get(namespace, name)
    }

    return descriptor
  }

  handler.has = (namespace, name) => {
    return name === shared.symbol.namespace ||
      Reflect.has(namespace, name)
  }

  handler.preventExtensions = (namespace) => {
    return entry._namespaceFinalized === NAMESPACE_FINALIZATION_COMPLETED &&
      Reflect.preventExtensions(namespace)
  }
}

function assignImmutableNamespaceHandlerTraps(handler, entry) {
  "use sloppy"

  handler.defineProperty = (namespace, name, descriptor) => {
    if (entry._namespaceFinalized === NAMESPACE_FINALIZATION_COMPLETED &&
        Reflect.has(namespace, name) &&
        isDescriptorMatch(Reflect.getOwnPropertyDescriptor(namespace, name), descriptor)) {
      return Reflect.defineProperty(namespace, name, descriptor)
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
    if (entry._namespaceFinalized !== NAMESPACE_FINALIZATION_COMPLETED) {
      return false
    }

    SafeObject.defineProperty(entry.exports, name, descriptor)

    if (Reflect.has(namespace, name)) {
      entry.addGetter(name, () => entry.exports[name])
      entry.updateBindings(name)
    }

    return Reflect.isExtensible(namespace) ||
      Reflect.defineProperty(namespace, name, descriptor)
  }

  handler.deleteProperty = (namespace, name) => {
    if (Reflect.deleteProperty(entry.exports, name)) {
      if (Reflect.has(namespace, name)) {
        entry.addGetter(name, () => entry.exports[name])
        entry.updateBindings(name)
      }

      return Reflect.isExtensible(namespace)
    }

    return false
  }

  const oldGet = handler.get

  if (typeof oldGet === "function") {
    handler.get = (namespace, name, receiver) => {
      const exported = entry.exports
      const value = oldGet(namespace, name, receiver)

      if (has(exported, name)) {
        const newValue = Reflect.get(exported, name, receiver)

        if ((value === INITIAL_VALUE ||
             newValue !== value) &&
            (entry.type !== TYPE_CJS ||
             name !== "default") &&
            isUpdatableGet(namespace, name)) {
          return newValue
        }
      }

      return value
    }
  }

  handler.getOwnPropertyDescriptor = (namespace, name) => {
    let descriptor = Reflect.getOwnPropertyDescriptor(namespace, name)

    if (descriptor === void 0
        ? ! Reflect.isExtensible(namespace)
        : ! isUpdatableDescriptor(descriptor)) {
      return descriptor
    }

    const exported = entry.exports

    if (has(exported, name)) {
      const exportedDescriptor = Reflect.getOwnPropertyDescriptor(exported, name)

      let value

      if (Reflect.has(exportedDescriptor, "value")) {
        value = exportedDescriptor.value
      } else if (typeof exportedDescriptor.get === "function") {
        value = tryGetter(exportedDescriptor.get)

        if (value === ERROR_GETTER) {
          return descriptor
        }
      }

      if (descriptor === void 0) {
        // Section 9.5.5: [[GetOwnProperty]]()
        // Step 17: Throw a type error if the resulting descriptor is
        // non-configurable while the target descriptor is `undefined` or
        // configurable.
        // https://tc39.github.io/ecma262/#sec-proxy-object-internal-methods-and-internal-slots-getownproperty-p
        return {
          configurable: true,
          enumerable: exportedDescriptor.enumerable,
          value,
          writable:
            exportedDescriptor.writable === true ||
            typeof exportedDescriptor.set === "function"
        }
      }

      descriptor.value = value
    } else if (descriptor !== void 0) {
      descriptor.value = handler.get(namespace, name)
    }

    return descriptor
  }

  handler.set = (namespace, name, value, receiver) => {
    if (! isUpdatableSet(namespace, name)) {
      return false
    }

    const exported = entry.exports

    if (receiver === proxy) {
      receiver = exported
    }

    if (Reflect.set(exported, name, value, receiver)) {
      if (Reflect.has(namespace, name)) {
        entry.addGetter(name, () => entry.exports[name])
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

function getExportByName(entry, name, parentEntry) {
  const parentIsMJS = parentEntry.extname === ".mjs"
  const { type } = entry

  if (name !== "*") {
    if (entry._loaded !== LOAD_COMPLETED) {
      return ERROR_GETTER
    }

    if ((type === TYPE_CJS ||
         (type === TYPE_PSEUDO &&
          parentIsMJS)) &&
        name === "default") {
      return entry.exports
    }

    const { getters } = entry

    return Reflect.has(getters, name)
      ? getters[name]()
      : ERROR_GETTER
  }

  const parentCJS = parentEntry.package.options.cjs

  const parentNamedExports =
    parentCJS.namedExports &&
    ! parentIsMJS

  const parentMutableNamespace =
    parentCJS.mutableNamespace &&
    ! parentIsMJS

  const useImmutableNamespace =
    ! parentMutableNamespace ||
    entry.extname === ".mjs"

  const usePartialNamespace =
    ! parentNamedExports &&
    type !== TYPE_ESM

  if (useImmutableNamespace) {
    return usePartialNamespace
      ? entry.partialNamespace
      : entry.completeNamespace
  }

  return usePartialNamespace
    ? entry.partialMutableNamespace
    : entry.completeMutableNamespace
}

function getExportByNameFast(entry, name, parentEntry) {
  if (name !== "*") {
    const { getters } = entry

    return Reflect.has(getters, name)
      ? tryGetter(getters[name])
      : ERROR_GETTER
  }

  const parentMutableNamespace =
    parentEntry.package.options.cjs.mutableNamespace &&
    parentEntry.extname !== ".mjs"

  const useImmutableNamespace =
    ! parentMutableNamespace ||
    entry.extname === ".mjs"

  return useImmutableNamespace
    ? entry.completeNamespace
    : entry.completeMutableNamespace
}

function getExportsObjectKeys(entry, exported = entry.exports) {
  const { type } = entry

  if (type === TYPE_ESM ||
      type === TYPE_WASM) {
    return keys(exported)
  }

  const isFunc = typeof exported === "function"
  const possibleNames = ownPropertyNames(exported)
  const proto = getPrototypeOf(exported)
  const result = []

  for (const name of possibleNames) {
    if (! isEnumerable(exported, name) &&
        (name === "__esModule" ||
         (isFunc &&
          name === "prototype") ||
         (has(proto, name) &&
          ! isEnumerable(proto, name)))) {
      continue
    }

    result.push(name)
  }

  return result
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
  const getter = entry.getters[name]

  if (getter === void 0 ||
      getter.type === GETTER_TYPE_STAR_CONFLICT) {
    return
  }

  const exported = entry.exports
  const value = tryGetter(getter)

  if (! Reflect.has(exported, name) ||
      ! Object.is(exported[name], value)) {
    entry._changed = true
    exported[name] = value
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
  } else if (entry.module.loaded) {
    entry.assignExportsToNamespace(names)
  }
}

function runSetter(entry, name, callback, updateType) {
  const setters = entry.setters[name]

  if (setters === void 0) {
    return
  }

  const isLoaded = entry._loaded === LOAD_COMPLETED
  const isNsChanged = entry._changed

  let { length } = setters

  while (length--) {
    const setter = setters[length]
    const value = entry.getExportByName(name, setter.owner)

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

      if (setter(setterValue, entry)) {
        setters.splice(length, 1)
      }

      if (changed ||
          ! isExportFrom) {
        callback(setter)
      }
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
