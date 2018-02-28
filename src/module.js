import GenericArray from "./generic/array.js"

import _compile from "./module/compile.js"
import _findPath from "./module/find-path.js"
import _initPaths from "./module/init-paths.js"
import _load from "./module/cjs/load.js"
import _nodeModulePaths from "./module/node-module-paths.js"
import _resolveFilename from "./module/cjs/resolve-filename.js"
import _resolveLookupPaths from "./module/resolve-lookup-paths.js"
import assign from "./util/assign.js"
import defaults from "./util/defaults.js"
import initGlobalPaths from "./module/init-global-paths.js"
import load from "./module/load.js"
import maskFunction from "./util/mask-function.js"
import moduleState from "./module/state.js"
import req from "./module/require.js"
import wrap from "./module/wrap.js"
import wrapper from "./module/wrapper.js"

const BuiltinModule = __non_webpack_module__.constructor
const BuiltinProto = BuiltinModule.prototype

const Module = maskFunction(function (id, parent) {
  const mod = new BuiltinModule(id, parent)
  Object.setPrototypeOf(mod, Module.prototype)
  return mod
}, BuiltinModule)

Module._extensions = { __proto__: null }
Module._findPath = maskFunction(_findPath, BuiltinModule._findPath)
Module._initPaths = maskFunction(_initPaths, BuiltinModule._initPaths)
Module._load = maskFunction(_load, BuiltinModule._load)
Module._nodeModulePaths = maskFunction(_nodeModulePaths, BuiltinModule._nodeModulePaths)
Module._resolveFilename = maskFunction(_resolveFilename, BuiltinModule._resolveFilename)
Module._resolveLookupPaths = maskFunction(_resolveLookupPaths, BuiltinModule._resolveLookupPaths)
Module.Module = Module
Module.wrap = maskFunction(wrap, BuiltinModule.wrap)
Module.wrapper = GenericArray.slice(wrapper)

Module.prototype._compile = maskFunction(_compile, BuiltinProto._compile)
Module.prototype.load = maskFunction(load, BuiltinProto.load)
Module.prototype.require = maskFunction(req, BuiltinProto.require)

defaults(Module, BuiltinModule)
assign(Module._extensions, BuiltinModule._extensions)

if (! Module.globalPaths) {
  Module.globalPaths = initGlobalPaths()
}

moduleState.globalPaths = GenericArray.slice(Module.globalPaths)

export default Module
