import Module from "../../module.js"

import findCompilerExtension from "../internal/find-compiler-extension.js"

function loader(entry, filename) {
  entry.updateFilename(filename)

  let ext = findCompilerExtension(Module._extensions, entry)

  if (ext === "") {
    ext = ".js"
  }

  const mod = entry.module

  mod.paths = Module._nodeModulePaths(entry.dirname)

  try {
    Module._extensions[ext](mod, filename)
  } finally {
    entry._passthruCompile = false
  }

  if (! mod.loaded) {
    mod.loaded = true
    entry.loaded()
  }
}

export default loader
