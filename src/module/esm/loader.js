import ENTRY from "../../constant/entry.js"

import Loader from "../../loader.js"
import Module from "../../module.js"

import findCompilerExtension from "../internal/find-compiler-extension.js"
import shared from "../../shared.js"
import staticNodeModulePaths from "../static/node-module-paths.js"

const {
  STATE_PARSING_COMPLETED,
  TYPE_ESM
} = ENTRY

function loader(entry, filename, parentEntry) {
  const { parsing } = shared.moduleState

  entry.updateFilename(filename)

  if (parentEntry === null) {
    parentEntry = entry
  }

  let { extensions } = Loader.state.module

  if (entry.extname === ".js" ||
      (parentEntry.package.options.cjs.extensions &&
       parentEntry.extname !== ".mjs")) {
    extensions = Module._extensions
  }

  let ext = findCompilerExtension(extensions, entry)

  if (ext === "") {
    ext = ".js"
  }

  const mod = entry.module

  if (! mod.paths) {
    if (parentEntry.type !== TYPE_ESM ||
        (entry.package.options.cjs.paths &&
         entry.extname !== ".mjs")) {
      mod.paths = Module._nodeModulePaths(entry.dirname)
    } else {
      mod.paths = staticNodeModulePaths(entry.dirname)
    }
  }

  if (parsing &&
      ext !== ".js" &&
      ext !== ".mjs") {
    entry.state = STATE_PARSING_COMPLETED
    return
  }

  extensions[ext](mod, filename)

  if (! parsing &&
      ! mod.loaded) {
    mod.loaded = true
  }
}

export default loader
