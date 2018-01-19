import Module from "../../module.js"

import extname from "../../path/extname.js"
import moduleNodeModulePaths from "../node-module-paths.js"
import moduleState from "../state.js"

function loader(entry, fromPath, parentOptions, preload) {
  const { filePath, module:mod } = entry

  if (! mod.paths) {
    mod.paths = parentOptions && parentOptions.cjs.paths
      ? Module._nodeModulePaths(fromPath)
      : moduleNodeModulePaths(fromPath)
  }

  if (! moduleState.parsing &&
      preload) {
    preload(entry)
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

  if (moduleState.parsing &&
      (ext === ".json" ||
       ext === ".node")) {
    entry.state = 2
    return
  }

  _extensions[ext](mod, filePath)

  if (! moduleState.parsing) {
    mod.loaded = true
  }
}

export default loader
