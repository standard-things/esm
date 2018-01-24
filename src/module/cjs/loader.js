import Module from "../../module.js"

import { dirname } from "path"
import extname from "../../path/extname.js"

function loader(entry, parent, preload) {
  const { filePath, module:mod } = entry

  mod.paths = Module._nodeModulePaths(dirname(filePath))

  if (preload) {
    preload(entry)
  }

  let ext = extname(filePath)

  if (ext === "" ||
      typeof Module._extensions[ext] !== "function") {
    ext = ".js"
  }

  Module._extensions[ext](mod, filePath)
  mod.loaded = true
}

export default loader
