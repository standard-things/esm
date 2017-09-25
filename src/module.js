import { dirname, extname } from "path"

import compile from "./module/compile.js"
import defaults from "./util/defaults.js"
import findPath from "./module/find-path.js"
import initPaths from "./module/init-paths.js"
import load from "./module/load.js"
import moduleState from "./module/state.js"
import nodeModulePaths from "./module/node-module-paths.js"
import resolveFilename from "./module/resolve-filename.js"
import resolveLookupPaths from "./module/resolve-lookup-paths.js"
import wrap from "./module/wrap.js"
import wrapper from "./module/wrapper.js"

const BuiltinModule = __non_webpack_module__.constructor

class Module extends BuiltinModule {
  _compile(content, filePath) {
    return compile(this, content, filePath)
  }

  load(filePath) {
    if (this.loaded) {
      throw new Error("Module already loaded: " + this.id)
    }

    const { _extensions } = this.constructor
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

  static _cache = moduleState.cache
  static _extensions = moduleState.extensions
  static _findPath = findPath
  static _initPaths = initPaths
  static _load = load
  static _nodeModulePaths = nodeModulePaths
  static _resolveFilename = resolveFilename
  static _resolveLookupPaths = resolveLookupPaths
  static _wrapper = wrapper
  static globalPaths = moduleState.globalPaths
  static wrap = wrap
}

defaults(Module, BuiltinModule)

export default Module
