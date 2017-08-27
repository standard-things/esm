import { dirname, extname } from "path"
import Wrapper from "../../wrapper.js"

import _load from "../load.js"
import nodeModulePaths from "../node-module-paths.js"

function load(id, parent, isMain) {
  return _load(id, parent, isMain, loader)
}

function loader(filePath) {
  const mod = this
  const { _extensions } = mod.constructor
  let ext = extname(filePath)

  if (! ext || typeof _extensions[ext] !== "function") {
    ext = ".js"
  }

  const compiler = Wrapper.unwrap(_extensions, ext)

  mod.filename = filePath
  mod.paths = nodeModulePaths(dirname(filePath))
  compiler.call(_extensions, mod, filePath)
  mod.loaded = true
}

export default load
