import ENV from "./constant/env.js"

import GenericArray from "./generic/array.js"
import GenericObject from "./generic/object.js"
import OwnProxy from "./own/proxy.js"
import RealModule from "./real/module.js"
import SafeModule from "./safe/module.js"
import SafeObject from "./safe/object.js"

import assign from "./util/assign.js"
import builtinIds from "./builtin-ids.js"
import getModuleDirname from "./util/get-module-dirname.js"
import isExtNode from "./path/is-ext-node.js"
import isObjectLike from "./util/is-object-like.js"
import maskFunction from "./util/mask-function.js"
import protoCompile from "./module/proto/compile.js"
import protoLoad from "./module/proto/load.js"
import protoReq from "./module/proto/require.js"
import safeDefaultProperties from "./util/safe-default-properties.js"
import staticCreateRequireFromPath from "./module/static/create-require-from-path.js"
import staticFindPath from "./module/static/find-path.js"
import staticInitPaths from "./module/static/init-paths.js"
import staticLoad from "./module/static/load.js"
import staticNodeModulePaths from "./module/static/node-module-paths.js"
import staticPreloadModules from "./module/static/preload-modules.js"
import staticResolveFilename from "./module/static/resolve-filename.js"
import staticResolveLookupPaths from "./module/static/resolve-lookup-paths.js"
import staticWrap from "./module/static/wrap.js"
import staticWrapper from "./module/static/wrapper.js"

const {
  ELECTRON
} = ENV

const Module = maskFunction(function (id = "", parent) {
  this.children = GenericArray.of()
  this.exports = GenericObject.create()
  this.filename = null
  this.id = id
  this.loaded = false
  this.parent = parent
  this.paths = void 0
  this.path = getModuleDirname(this)

  const children = parent == null
    ? null
    : parent.children

  if (Array.isArray(children)) {
    GenericArray.push(children, this)
  }
}, RealModule)

Module._cache = __non_webpack_require__.cache
Module._extensions = { __proto__: null }
Module._findPath = staticFindPath
Module._initPaths = staticInitPaths
Module._load = staticLoad
Module._nodeModulePaths = staticNodeModulePaths
Module._preloadModules = staticPreloadModules
Module._resolveFilename = staticResolveFilename
Module._resolveLookupPaths = staticResolveLookupPaths
Module.Module = Module
Module.builtinModules = Object.freeze(GenericArray.from(builtinIds))
Module.createRequireFromPath = staticCreateRequireFromPath
Module.wrap = staticWrap

// Initialize `Module._extensions` with only the enumerable string keyed
// properties of `RealModule._extensions` to avoid `shared.symbol.wrapper`
// and other meta properties.
assign(Module._extensions, RealModule._extensions)
safeDefaultProperties(Module, RealModule)

if (! isObjectLike(Module._cache)) {
  Module._cache = { __proto__: null }
}

if (Module._cache !== RealModule._cache) {
  // Ensure `.node` files are cached in the real `Module._cache`
  // when `require.cache` is different than `Module._cache`.
  Module._cache = new OwnProxy(Module._cache, {
    defineProperty(cache, name, descriptor) {
      const { _cache } = RealModule

      if (isExtNode(name) &&
          isObjectLike(_cache)) {
        Reflect.defineProperty(_cache, name, descriptor)
      }

      // Use `Object.defineProperty()` instead of `Reflect.defineProperty()`
      // to throw the appropriate error if something goes wrong.
      // https://tc39.github.io/ecma262/#sec-definepropertyorthrow
      SafeObject.defineProperty(cache, name, descriptor)

      return true
    },
    deleteProperty(cache, name) {
      const { _cache } = RealModule

      if (isExtNode(name) &&
          isObjectLike(_cache)) {
        Reflect.deleteProperty(_cache, name)
      }

      return Reflect.deleteProperty(cache, name)
    },
    set(cache, name, value, receiver) {
      const { _cache } = RealModule

      if (isExtNode(name) &&
          isObjectLike(_cache)) {
        Reflect.set(_cache, name, value)
      }

      return Reflect.set(cache, name, value, receiver)
    }
  })
}

if (! ELECTRON ||
    ! Array.isArray(SafeModule.wrapper)) {
  Module.wrapper = staticWrapper
}

const ModuleProto = Module.prototype

ModuleProto._compile = protoCompile
ModuleProto.constructor = Module
ModuleProto.load = protoLoad
ModuleProto.require = protoReq

if (! Array.isArray(Module.globalPaths)) {
  Module._initPaths()
}

export default Module
