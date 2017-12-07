import Entry from "../../entry.js"
import Module from "../../module.js"
import Wrapper from "../../wrapper.js"

import _load from "../_load.js"
import { dirname } from "path"
import extname from "../../path/extname.js"

function load(id, parent, isMain, preload) {
  const parentEntry = Entry.get(parent)
  const parentSpecifiers = parentEntry && parentEntry.specifiers

  let filePath
  let called = false

  if (parentSpecifiers &&
      id in parentSpecifiers) {
    filePath = parentSpecifiers[id]
  } else {
    filePath = Module._resolveFilename(id, parent, isMain)
  }

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

  if (typeof extCompiler !== "function") {
    extCompiler = _extensions[ext]
  }

  extCompiler.call(_extensions, mod, filePath)
  mod.loaded = true
}

export default load
