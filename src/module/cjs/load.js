import { dirname, extname } from "path"

import Wrapper from "../../wrapper.js"

import _load from "../_load.js"
import nodeModulePaths from "../node-module-paths.js"
import resolveFilename from "./resolve-filename.js"

function load(id, parent, isMain, options) {
  const filePath = resolveFilename(id, parent, isMain, options)
  return _load(filePath, parent, isMain, __non_webpack_require__, loader)
}

function loader(filePath) {
  let ext = extname(filePath)
  const { extensions } = __non_webpack_require__

  if (! ext || typeof extensions[ext] !== "function") {
    ext = ".js"
  }

  const mod = this
  mod.filename = filePath
  mod.paths = nodeModulePaths(dirname(filePath))

  const extCompiler = Wrapper.unwrap(extensions, ext)
  extCompiler.call(extensions, mod, filePath)
  mod.loaded = true
}

export default load
