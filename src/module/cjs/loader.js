import PACKAGE from "../../constant/package.js"

import Module from "../../module.js"

import dirname from "../../path/dirname.js"
import extname from "../../path/extname.js"

const {
  OPTIONS_MODE_STRICT
} = PACKAGE

function loader(entry, filename, parentEntry) {
  let ext = extname(filename)

  if (ext === "" ||
      ! Reflect.has(Module._extensions, ext)) {
    ext = ".js"
  }

  if (ext === ".mjs" ||
      (parentEntry &&
       parentEntry.package.options.mode === OPTIONS_MODE_STRICT)) {
    entry._passthru = true
  }

  const mod = entry.module

  mod.filename = filename
  mod.paths = Module._nodeModulePaths(dirname(filename))

  try {
    Module._extensions[ext](mod, filename)
  } finally {
    entry._passthru = false
  }

  mod.loaded = true
  entry.loaded()
}

export default loader
