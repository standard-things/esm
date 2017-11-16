import Entry from "../../entry.js"
import Module from "../../module.js"
import PkgInfo from "../../pkg-info.js"
import Wrapper from "../../wrapper.js"

import _load from "../_load.js"
import { dirname } from "path"
import extname from "../../path/extname.js"
import moduleResolveFilename from "../resolve-filename.js"
import resolveFilename from "./resolve-filename.js"

const mjsSym = Symbol.for('@std/esm:module._extensions[".mjs"]')

function load(id, parent, isMain, preload) {
  const parentFilename = (parent && parent.filename) || "."
  const parentPkgInfo = PkgInfo.get(dirname(parentFilename))
  const parentOptions = parentPkgInfo && parentPkgInfo.options

  let filePath

  if (parentOptions && parentOptions.cjs.paths &&
      Module._resolveFilename !== moduleResolveFilename) {
    filePath = Module._resolveFilename(id, parent, isMain)
  } else {
    filePath = resolveFilename(id, parent, isMain)
  }

  let called = false

  const child = _load(filePath, parent, isMain, __non_webpack_require__, function () {
    called = true
    return loader.call(this, filePath, parentOptions, preload)
  })

  if (! called &&
      preload) {
    called = true
    preload(child)
  }

  return child
}

function loader(filePath, parentOptions, preload) {
  const mod = this
  Entry.get(mod)

  mod.filename = filePath
  mod.paths = Module._nodeModulePaths(dirname(filePath))

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

  if (parentOptions &&
      extCompiler[mjsSym] &&
      (parentOptions.cjs.extensions || parentOptions.esm !== "mjs")) {
    extCompiler = extensions[ext]
  }

  extCompiler.call(extensions, mod, filePath)
  mod.loaded = true
}

export default load
