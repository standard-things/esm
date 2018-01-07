import { dirname, extname } from "path"

import NullObject from "./null-object.js"

import assign from "./util/assign.js"
import compile from "./module/compile.js"
import defaults from "./util/defaults.js"
import findPath from "./module/find-path.js"
import initPaths from "./module/init-paths.js"
import load from "./module/cjs/load.js"
import moduleState from "./module/state.js"
import nodeModulePaths from "./module/node-module-paths.js"
import resolveFilename from "./module/cjs/resolve-filename.js"
import resolveLookupPaths from "./module/resolve-lookup-paths.js"
import setProperty from "./util/set-property.js"
import wrap from "./module/wrap.js"
import wrapper from "./module/wrapper.js"

const BuiltinModule = __non_webpack_module__.constructor

class Module extends BuiltinModule {
  _compile(content, filePath) {
    if (! moduleState.parsing) {
      return compile(this, content, filePath)
    }
  }

  load(filePath) {
    if (this.loaded) {
      throw new Error("Module already loaded: " + this.id)
    }

    const { _extensions } = Module
    let ext = extname(filePath)

    if (ext === "" ||
        typeof _extensions[ext] !== "function") {
      ext = ".js"
    }

    this.filename = filePath
    this.paths = nodeModulePaths(dirname(filePath))

    _extensions[ext](this, filePath)
    this.loaded = true
  }

  static _extensions = new NullObject
  static _findPath = findPath
  static _initPaths = initPaths
  static _load = load
  static _nodeModulePaths = nodeModulePaths
  static _resolveFilename = resolveFilename
  static _resolveLookupPaths = resolveLookupPaths
  static Module = Module
  static globalPaths = moduleState.globalPaths.slice()
  static wrap = wrap
  static wrapper = wrapper.slice()
}

defaults(Module, BuiltinModule)
assign(Module._extensions, BuiltinModule._extensions)

setProperty(Module, "length", {
  enumerable: false,
  value: 2,
  writable: false
})

export default Module
