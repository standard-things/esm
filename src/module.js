import { dirname, extname } from "path"

import builtinModules from "./builtin-modules.js"
import compile from "./module/compile.js"
import defaults from "./util/defaults.js"
import findPath from "./module/find-path.js"
import initPaths from "./module/init-paths.js"
import load from "./module/cjs/load.js"
import moduleState from "./module/state.js"
import nodeModulePaths from "./module/node-module-paths.js"
import resolveFilename from "./module/cjs/resolve-filename.js"
import resolveLookupPaths from "./module/resolve-lookup-paths.js"

const BuiltinModule = __non_webpack_module__.constructor

const wrapper = [
  "(function(exports,require,module,__filename,__dirname){",
  "\n})"
]

class Module extends BuiltinModule {
  constructor(id, parent) {
    super(id, parent)
  }

  _compile(content, filePath) {
    return compile(this, content, filePath)
  }

  load(filePath) {
    if (this.loaded) {
      throw new Error("Module already loaded: " + this.id)
    }

    const { _extensions } = this.constructor
    let ext = extname(filePath)

    if (! ext || typeof _extensions[ext] !== "function") {
      ext = ".js"
    }

    this.filename = filePath
    this.paths = nodeModulePaths(dirname(filePath))
    _extensions[ext](this, filePath)
    this.loaded = true
  }

  wrap(script) {
    return wrapper[0] + script + wrapper[1]
  }

  static _cache = moduleState.cache
  static _extensions = moduleState.extensions
  static _initPaths = initPaths
  static _nodeModulePaths = nodeModulePaths
  static _wrapper = wrapper
  static globalPaths = moduleState.globalPaths

  static _findPath(id, paths, isMain) {
    return findPath(id, paths, isMain) || false
  }

  static _load(id, parent, isMain) {
    return id in builtinModules
      ? builtinModules[id].exports
      : load(id, parent, isMain)
  }

  static _resolveFilename(id, parent, isMain) {
    return id in builtinModules
      ? id
      : resolveFilename(id, parent, isMain)
  }

  static _resolveLookupPaths(id, parent) {
    return id in builtinModules
      ? null
      : resolveLookupPaths(id, parent)
  }
}

defaults(Module, BuiltinModule)

export default Module
