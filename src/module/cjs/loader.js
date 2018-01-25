import Module from "../../module.js"

import { dirname } from "path"
import extname from "../../path/extname.js"

function loader(entry, parent, preload) {
  const mod = entry.module
  const { filename } = mod

  mod.paths = Module._nodeModulePaths(dirname(filename))

  if (preload) {
    preload(entry)
  }

  let ext = extname(filename)

  if (ext === "" ||
      typeof Module._extensions[ext] !== "function") {
    ext = ".js"
  }

  Module._extensions[ext](mod, filename)
  mod.loaded = true
}

export default loader
