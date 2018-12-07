import ENV from "./constant/env.js"

import GenericArray from "./generic/array.js"
import GenericObject from "./generic/object.js"
import RealModule from "./real/module.js"

import assign from "./util/assign.js"
import builtinIds from "./builtin-ids.js"
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

Module._extensions = _extensions
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
Module.wrapper = staticWrapper

prototype._compile = protoCompile
prototype.constructor = Module
prototype.load = protoLoad
prototype.require = req

// Initialize `Module._extensions` with only the enumerable string keyed
// properties of `RealModule._extensions` to avoid `shared.symbol.wrapper`
// and other meta properties.
assign(_extensions, RealModule._extensions)
safeDefaultProperties(Module, RealModule)

if (JEST) {
  Module._cache = { __proto__: null }
}

if (! Array.isArray(Module.globalPaths)) {
  Module._initPaths()
}

export default Module
