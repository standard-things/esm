import GenericArray from "./generic/array.js"
import RealModule from "./real/module.js"

import _compile from "./module/compile.js"
import _findPath from "./module/find-path.js"
import _initPaths from "./module/init-paths.js"
import _load from "./module/cjs/load.js"
import _nodeModulePaths from "./module/node-module-paths.js"
import _resolveFilename from "./module/cjs/resolve-filename.js"
import _resolveLookupPaths from "./module/resolve-lookup-paths.js"
import assign from "./util/assign.js"
import builtinIds from "./builtin-ids.js"
import defaults from "./util/defaults.js"
import initGlobalPaths from "./module/init-global-paths.js"
import load from "./module/load.js"
import maskFunction from "./util/mask-function.js"
import moduleState from "./module/state.js"
import parseState from "./parse/state.js"
import req from "./module/require.js"

const realProto = RealModule.prototype

const Module = maskFunction(function (id, parent) {
  const mod = new RealModule(id, parent)

  Reflect.setPrototypeOf(mod, Module.prototype)
  return mod
}, RealModule)

Module._extensions = { __proto__: null }
Module._findPath = maskFunction(_findPath, RealModule._findPath)
Module._initPaths = maskFunction(_initPaths, RealModule._initPaths)
Module._load = maskFunction(_load, RealModule._load)
Module._nodeModulePaths = maskFunction(_nodeModulePaths, RealModule._nodeModulePaths)
Module._resolveFilename = maskFunction(_resolveFilename, RealModule._resolveFilename)
Module._resolveLookupPaths = maskFunction(_resolveLookupPaths, RealModule._resolveLookupPaths)
Module.Module = Module
Module.builtinModules = Object.freeze(GenericArray.from(builtinIds))

Module.prototype._compile = maskFunction(_compile, realProto._compile)
Module.prototype.constructor = Module
Module.prototype.load = maskFunction(load, realProto.load)
Module.prototype.require = maskFunction(req, realProto.require)

defaults(Module, RealModule)
assign(Module._extensions, RealModule._extensions)

if (! Module.globalPaths) {
  Module.globalPaths = initGlobalPaths()
}

moduleState.globalPaths = GenericArray.from(Module.globalPaths)

parseState._cache = new Proxy(parseState._cache, {
  get(target, name) {
    return Reflect.has(target, name)
      ? target[name]
      : Module._cache[name]
  }
})

export default Module
