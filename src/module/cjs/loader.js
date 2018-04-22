import Module from "../../module.js"
import Wrapper from "../../wrapper.js"

import { extname } from "../../safe/path.js"

function loader(entry, preload) {
  if (preload) {
    preload(entry)
  }

  const { _extensions } = Module
  const mod = entry.module
  const { filename } = mod

  let ext = extname(filename)

  if (ext === "" ||
      typeof _extensions[ext] !== "function") {
    ext = ".js"
  }

  if (ext === ".mjs") {
    Reflect.apply(Wrapper.unwrap(_extensions, ext), _extensions, [mod, filename])
  } else {
    _extensions[ext](mod, filename)
  }

  mod.loaded = true
}

export default loader
