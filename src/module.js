import ENV from "./constant/env.js"

import GenericArray from "./generic/array.js"
import GenericObject from "./generic/object.js"
import RealModule from "./real/module.js"

import assign from "./util/assign.js"
import builtinIds from "./builtin-ids.js"
import defaults from "./util/defaults.js"
import esmState from "./module/esm/state.js"
import initGlobalPaths from "./module/internal/init-global-paths.js"
import maskFunction from "./util/mask-function.js"
import parseState from "./parse/state.js"
import protoCompile from "./module/proto/compile.js"
import protoLoad from "./module/proto/load.js"
import req from "./module/proto/require.js"
import staticFindPath from "./module/static/find-path.js"
import staticInitPaths from "./module/static/init-paths.js"
import staticLoad from "./module/static/load.js"
import staticNodeModulePaths from "./module/static/node-module-paths.js"
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

  const children = parent && parent.children

  if (children) {
    GenericArray.push(children, this)
  }
}, RealModule)

Module._extensions = { __proto__: null }
Module._findPath = maskFunction(staticFindPath, RealModule.staticFindPath)
Module._initPaths = maskFunction(staticInitPaths, RealModule.staticInitPaths)
Module._load = maskFunction(staticLoad, RealModule._load)
Module._nodeModulePaths = maskFunction(staticNodeModulePaths, RealModule.staticNodeModulePaths)
Module._resolveFilename = maskFunction(staticResolveFilename, RealModule.staticResolveFilename)
Module._resolveLookupPaths = maskFunction(staticResolveLookupPaths, RealModule.staticResolveLookupPaths)
Module.Module = Module
Module.builtinModules = Object.freeze(GenericArray.from(builtinIds))
Module.wrap = maskFunction(staticWrap, RealModule.wrap)
Module.wrapper = staticWrapper

const { prototype } = Module
const realProto = RealModule.prototype

prototype._compile = maskFunction(protoCompile, realProto._compile)
prototype.constructor = Module
prototype.load = maskFunction(protoLoad, realProto.load)
prototype.require = maskFunction(req, realProto.require)

defaults(Module, RealModule)
assign(Module._extensions, RealModule._extensions)

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

parseState._cache = new Proxy(parseState._cache, {
  get(target, name) {
    return Reflect.has(target, name)
      ? target[name]
      : Module._cache[name]
  }
})

export default Module
