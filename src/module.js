import ENV from "./constant/env.js"

import GenericArray from "./generic/array.js"
import GenericObject from "./generic/object.js"
import RealModule from "./real/module.js"

import assign from "./util/assign.js"
import builtinIds from "./builtin-ids.js"
import esmState from "./module/esm/state.js"
import initGlobalPaths from "./module/internal/init-global-paths.js"
import maskFunction from "./util/mask-function.js"
import protoCompile from "./module/proto/compile.js"
import protoLoad from "./module/proto/load.js"
import req from "./module/proto/require.js"
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
  JEST
} = ENV

const Module = maskFunction(function (id, parent) {
  this.children = GenericArray.of()
  this.exports = GenericObject.create()
  this.filename = null
  this.id = id
  this.loaded = false
  this.parent = parent

  const children = parent ? parent.children : null

  if (Array.isArray(children)) {
    GenericArray.push(children, this)
  }
}, RealModule)

const _extensions = { __proto__: null }
const { prototype } = Module
const realProto = RealModule.prototype

Module._extensions = _extensions
Module._findPath = maskFunction(staticFindPath, RealModule._findPath)
Module._initPaths = maskFunction(staticInitPaths, RealModule._initPaths)
Module._load = maskFunction(staticLoad, RealModule._load)
Module._nodeModulePaths = maskFunction(staticNodeModulePaths, RealModule._nodeModulePaths)
Module._preloadModules = maskFunction(staticPreloadModules, RealModule._preloadModules)
Module._resolveFilename = maskFunction(staticResolveFilename, RealModule._resolveFilename)
Module._resolveLookupPaths = maskFunction(staticResolveLookupPaths, RealModule._resolveLookupPaths)
Module.Module = Module
Module.builtinModules = Object.freeze(GenericArray.from(builtinIds))
Module.createRequireFromPath = maskFunction(staticCreateRequireFromPath, RealModule.createRequireFromPath)
Module.wrap = maskFunction(staticWrap, RealModule.wrap)
Module.wrapper = staticWrapper

prototype._compile = maskFunction(protoCompile, realProto._compile)
prototype.constructor = Module
prototype.load = maskFunction(protoLoad, realProto.load)
prototype.require = maskFunction(req, realProto.require)

// Initialize `Module._extensions` with only the enumerable string keyed
// properties of `RealModule._extensions` to avoid `shared.symbol.wrapper`
// and other meta properties.
assign(_extensions, RealModule._extensions)
safeDefaultProperties(Module, RealModule)

if (JEST) {
  Module._cache = { __proto__: null }
}

if (Module.globalPaths) {
  esmState.globalPaths = GenericArray.from(Module.globalPaths)
} else {
  const globalPaths = initGlobalPaths()

  esmState.globalPaths = globalPaths
  Module.globalPaths = GenericArray.from(globalPaths)
}

esmState.scratchCache = new Proxy(esmState.scratchCache, {
  get(target, name) {
    return Reflect.has(target, name)
      ? target[name]
      : Module._cache[name]
  }
})

export default Module
