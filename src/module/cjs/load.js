import { dirname, extname } from "path"

import Wrapper from "../../wrapper.js"

import _load from "../_load.js"
import nodeModulePaths from "../node-module-paths.js"
import resolveFilename from "./resolve-filename.js"

const extSym = Symbol.for("@std/esm:extensions")

function load(id, parent, isMain, options) {
  const filePath = resolveFilename(id, parent, isMain, options)

  return _load(filePath, parent, isMain, __non_webpack_require__, function () {
    return loader.call(this, filePath, options)
  })
}

function loader(filePath, options) {
  let ext = extname(filePath)
  const { extensions } = __non_webpack_require__

  if (ext === "" ||
      typeof extensions[ext] !== "function") {
    ext = ".js"
  }

  let extCompiler = Wrapper.unwrap(extensions, ext)

  if (extCompiler[extSym] &&
      options && (options.cjs || options.esm !== "mjs")) {
    extCompiler = extensions[ext]
  }

  const mod = this
  mod.filename = filePath
  mod.paths = nodeModulePaths(dirname(filePath))

  extCompiler.call(extensions, mod, filePath)
  mod.loaded = true
}

export default load
