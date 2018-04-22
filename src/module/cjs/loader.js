import PACKAGE from "../../constant/package.js"

import Module from "../../module.js"
import Wrapper from "../../wrapper.js"

import { extname } from "../../safe/path.js"

const {
  OPTIONS_MODE_STRICT
} = PACKAGE

function loader(entry, filename, parentEntry, preload) {
  if (preload) {
    preload(entry)
  }

  const { _extensions } = Module
  const mod = entry.module

  let ext = extname(filename)

  if (ext === "" ||
      typeof _extensions[ext] !== "function") {
    ext = ".js"
  }

  const parentIsStrict =
    parentEntry &&
    parentEntry.package.options.mode === OPTIONS_MODE_STRICT

  if (parentIsStrict ||
      ext === ".mjs") {
    Reflect.apply(Wrapper.unwrap(_extensions, ext), _extensions, [mod, filename])
  } else {
    _extensions[ext](mod, filename)
  }

  mod.loaded = true
}

export default loader
