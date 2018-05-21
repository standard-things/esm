import PACKAGE from "../../constant/package.js"

import Module from "../../module.js"

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

  if (ext === ".mjs" ||
      (parentEntry &&
       parentEntry.package.options.mode === OPTIONS_MODE_STRICT)) {
    entry._passthru = true
  }

  try {
    _extensions[ext](mod, filename)
  } finally {
    entry._passthru = false
  }

  mod.loaded = true
  entry.loaded()
}

export default loader
