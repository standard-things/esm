import Entry from "../../entry.js"
import Module from "../../module.js"

import { dirname } from "path"
import extname from "../../path/extname.js"
import moduleState from "../state.js"

function loader(filePath, parent, preload) {
  const mod = this
  mod.filename = filePath
  mod.paths = Module._nodeModulePaths(dirname(filePath))

  // Initialize the entry here to enable using `Entry.has(mod)` as a way to
  // detect side loaded modules.
  Entry.get(mod)

  if (preload) {
    preload(mod)
  }

  const { _extensions } = Module
  let ext = extname(filePath)

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
