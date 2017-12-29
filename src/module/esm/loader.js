import Entry from "../../entry.js"
import Module from "../../module.js"

import extname from "../../path/extname.js"
import moduleNodeModulePaths from "../node-module-paths.js"
import moduleState from "../state.js"

function loader(filePath, fromPath, url, parentOptions, preload) {
  const mod = this
  mod.filename = filePath

  if (Module._nodeModulePaths !== moduleNodeModulePaths &&
      parentOptions && parentOptions.cjs.paths) {
    mod.paths = Module._nodeModulePaths(fromPath)
  } else {
    mod.paths = moduleNodeModulePaths(fromPath)
  }

  Entry.get(mod).url = url

  if (preload) {
    preload(mod)
  }

  let { _extensions } = moduleState
  let ext = extname(filePath)

  if (ext === ".js" ||
      (parentOptions && parentOptions.cjs.extensions)) {
    _extensions = Module._extensions
  }

  if (ext === "" ||
      typeof _extensions[ext] !== "function") {
    ext = ".js"
  }

  _extensions[ext](mod, filePath)

  if (! moduleState.parsing) {
    mod.loaded = true
  }
}

export default loader
