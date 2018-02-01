import NullObject from "./null-object.js"

import _compile from "./module/compile.js"
import _findPath from "./module/find-path.js"
import _initPaths from "./module/init-paths.js"
import _load from "./module/cjs/load.js"
import _nodeModulePaths from "./module/node-module-paths.js"
import _resolveFilename from "./module/cjs/resolve-filename.js"
import _resolveLookupPaths from "./module/resolve-lookup-paths.js"
import assign from "./util/assign.js"
import defaults from "./util/defaults.js"
import load from "./module/load.js"
import moduleState from "./module/state.js"
import req from "./module/require.js"
import setProperty from "./util/set-property.js"
import wrap from "./module/wrap.js"
import wrapper from "./module/wrapper.js"

const BuiltinModule = __non_webpack_module__.constructor

class Module extends BuiltinModule {
  static _extensions = new NullObject
  static _findPath = _findPath
  static _initPaths = _initPaths
  static _load = _load
  static _nodeModulePaths = _nodeModulePaths
  static _resolveFilename = _resolveFilename
  static _resolveLookupPaths = _resolveLookupPaths
  static Module = Module
  static globalPaths = moduleState.globalPaths.slice()
  static wrap = wrap
  static wrapper = wrapper.slice()
}

Module.prototype._compile = _compile
Module.prototype.load = load
Module.prototype.require = req

defaults(Module, BuiltinModule)
assign(Module._extensions, BuiltinModule._extensions)

setProperty(Module, "length", {
  enumerable: false,
  value: 2,
  writable: false
})

export default Module
