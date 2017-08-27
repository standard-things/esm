import { dirname, extname } from "path"
import assign from "./util/assign.js"
import compile from "./module/compile.js"
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

    let ext = extname(filePath) || ".js"

    if (! (ext in Module._extensions)) {
      ext = ".js"
    }

    this.filename = filePath
    this.paths = nodeModulePaths(dirname(filePath))
    Module._extensions[ext](this, filePath)
    this.loaded = true
  }

  wrap(script) {
    return wrapper[0] + script + wrapper[1]
  }
}

assign(Module, BuiltinModule)

Module._cache = moduleState._cache
Module._extensions = moduleState._extensions
Module._findPath = findPath
Module._initPaths = initPaths
Module._load = load
Module._nodeModulePaths = nodeModulePaths
Module._resolveFilename = resolveFilename
Module._resolveLookupPaths = resolveLookupPaths
Module._wrapper = wrapper
Module.globalPaths = moduleState.globalPaths

export default Module
