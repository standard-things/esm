import PACKAGE from "../../constant/package.js"

import Module from "../../module.js"

import findCompilerExtension from "../internal/find-compiler-extension.js"

const {
  MODE_STRICT
} = PACKAGE

function loader(entry, filename, parentEntry) {
  entry.updateFilename(filename)

  let ext = findCompilerExtension(Module._extensions, entry)

  if (ext === "") {
    ext = ".js"
  }

  if (ext === ".mjs" ||
      (parentEntry &&
       parentEntry.package.options.mode === MODE_STRICT)) {
    entry._passthru = true
  }

  const mod = entry.module

  mod.paths = Module._nodeModulePaths(entry.dirname)

  try {
    Module._extensions[ext](mod, filename)
  } finally {
    entry._passthru = false
  }

  mod.loaded = true
  entry.loaded()
}

export default loader
