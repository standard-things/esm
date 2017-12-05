import Entry from "../../entry.js"
import Module from "../../module.js"
import PkgInfo from "../../pkg-info.js"
import Wrapper from "../../wrapper.js"

import _load from "../_load.js"
import { dirname } from "path"
import extname from "../../path/extname.js"

const mjsSym = Symbol.for('@std/esm:Module._extensions[".mjs"]')

function load(id, parent, isMain, preload) {
  let called = false
  const filePath = Module._resolveFilename(id, parent, isMain)
  const child = _load(filePath, parent, isMain, Module, function () {
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

  const { _extensions } = Module
  let ext = extname(filePath)

  if (ext === "" ||
      typeof _extensions[ext] !== "function") {
    ext = ".js"
  }

  let extCompiler = Wrapper.unwrap(_extensions, ext)

  if (typeof extCompiler === "function") {
    if (extCompiler[mjsSym]) {
      const parentFilePath = (parent && parent.filename) || "."
      const parentPkgInfo = PkgInfo.get(dirname(parentFilePath))
      const parentOptions = parentPkgInfo && parentPkgInfo.options

      if (parentOptions &&
          (parentOptions.cjs.extensions || parentOptions.esm !== "mjs")) {
        extCompiler = _extensions[ext]
      }
    }
  } else {
    extCompiler = _extensions[ext]
  }

  extCompiler.call(_extensions, mod, filePath)
  mod.loaded = true
}

export default load
