import Entry from "../../entry.js"
import Module from "../../module.js"
import PkgInfo from "../../pkg-info.js"
import Wrapper from "../../wrapper.js"

import _load from "../_load.js"
import { dirname } from "path"
import extname from "../../path/extname.js"

const mjsSym = Symbol.for('@std/esm:module._extensions[".mjs"]')

function load(id, parent, isMain, preload) {
  let called = false
  const filePath = Module._resolveFilename(id, parent, isMain)
  const child = _load(filePath, parent, isMain, __non_webpack_require__, function () {
    called = true
    return loader.call(this, filePath, parent, preload)
  })

  if (! called &&
      preload) {
    called = true
    preload(child)
  }

  return child
}

function loader(filePath, parent, preload) {
  const mod = this
  mod.filename = filePath
  mod.paths = Module._nodeModulePaths(dirname(filePath))

  Entry.get(mod)

  if (preload) {
    preload(mod)
  }

  let ext = extname(filePath)
  const { extensions } = __non_webpack_require__

  if (ext === "" ||
      typeof extensions[ext] !== "function") {
    ext = ".js"
  }

  let extCompiler = Wrapper.unwrap(extensions, ext)

  if (typeof extCompiler === "function") {
    if (extCompiler[mjsSym]) {
      const parentFilePath = (parent && parent.filename) || "."
      const parentPkgInfo = PkgInfo.get(dirname(parentFilePath))
      const parentOptions = parentPkgInfo && parentPkgInfo.options

      if (parentOptions &&
          (parentOptions.cjs.extensions || parentOptions.esm !== "mjs")) {
        extCompiler = extensions[ext]
      }
    }
  } else {
    extCompiler = extensions[ext]
  }

  extCompiler.call(extensions, mod, filePath)
  mod.loaded = true
}

export default load
