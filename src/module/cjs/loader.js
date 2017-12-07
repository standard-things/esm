import Entry from "../../entry.js"
import Module from "../../module.js"
import Wrapper from "../../wrapper.js"

import { dirname } from "path"
import extname from "../../path/extname.js"

function loader(filePath, parent, preload) {
  const mod = this
  mod.filename = filePath
  mod.paths = Module._nodeModulePaths(dirname(filePath))

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

  let extCompiler = Wrapper.unwrap(_extensions, ext)

  if (typeof extCompiler !== "function") {
    extCompiler = _extensions[ext]
  }

  extCompiler.call(_extensions, mod, filePath)
  mod.loaded = true
}

export default loader
