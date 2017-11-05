import Entry from "../../entry.js"
import Wrapper from "../../wrapper.js"

import _load from "../_load.js"
import { dirname } from "path"
import extname from "../../path/extname.js"
import nodeModulePaths from "../node-module-paths.js"
import resolveFilename from "./resolve-filename.js"

const extSym = Symbol.for("@std/esm:extensions")

function load(id, parent, isMain, options, preload) {
  let called = false
  const filePath = resolveFilename(id, parent, isMain, options)
  const child = _load(filePath, parent, isMain, __non_webpack_require__, function () {
    called = true
    return loader.call(this, filePath, options, preload)
  })

  if (! called &&
      preload) {
    called = true
    preload(child)
  }

  return child
}

function loader(filePath, options, preload) {
  const mod = this
  Entry.get(mod)

  mod.filename = filePath
  mod.paths = nodeModulePaths(dirname(filePath))

  if (preload) {
    preload(mod)
  }

  let ext = extname(filePath)
  const { extensions } = __non_webpack_require__

  if (ext === "" ||
      typeof extensions[ext] !== "function") {
    ext = ".js"
  }

  let extCompiler = Wrapper.unwrap(extensions, ext) || extensions[ext]

  if (extCompiler[extSym] &&
      (options.cjs.extensions || options.esm !== "mjs")) {
    extCompiler = extensions[ext]
  }

  extCompiler.call(extensions, mod, filePath)
  mod.loaded = true
}

export default load
