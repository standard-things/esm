import Entry from "../../entry.js"
import PkgInfo from "../../pkg-info.js"
import Wrapper from "../../wrapper.js"

import _load from "../_load.js"
import { dirname } from "path"
import extname from "../../path/extname.js"
import nodeModulePaths from "../node-module-paths.js"
import resolveFilename from "./resolve-filename.js"

const mjsSym = Symbol.for('@std/esm:module._extensions[".mjs"]')

function load(id, parent, isMain, preload) {
  let called = false
  const filePath = resolveFilename(id, parent, isMain)
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

  if (extCompiler[mjsSym]) {
    const filename = parent && typeof parent.filename === "string"
      ? parent.filename
      : "."

    const pkgInfo = PkgInfo.get(dirname(filename))

    if (pkgInfo &&
        (pkgInfo.options.cjs.extensions || pkgInfo.options.esm !== "mjs")) {
      extCompiler = extensions[ext]
    }
  }

  extCompiler.call(extensions, mod, filePath)
  mod.loaded = true
}

export default load
