import ENTRY from "../../constant/entry.js"

import Loader from "../../loader.js"
import Module from "../../module.js"

import findCompilerExtension from "../internal/find-compiler-extension.js"
import shared from "../../shared.js"
import staticNodeModulePaths from "../static/node-module-paths.js"

const {
  STATE_PARSING_COMPLETED,
  TYPE_CJS,
  TYPE_PSEUDO
} = ENTRY

function loader(entry, filename, parentEntry) {
  const { parsing } = shared.moduleState

  entry.updateFilename(filename)

  if (parentEntry === null) {
    parentEntry = entry
  }

  let { extensions } = Loader.state.module

  const ext = entry.extname
  const parentExt = parentEntry.extname
  const parentType = parentEntry.type
  const parentIsCJS = parentType === TYPE_CJS
  const parentIsMJS = parentExt === ".mjs"
  const parentIsPseudo = parentType === TYPE_PSEUDO

  if (parentIsCJS ||
      parentIsPseudo ||
      ext === ".js" ||
      ((ext === ".cjs" ||
        parentEntry.package.options.cjs.extensions) &&
       ! parentIsMJS)) {
    extensions = Module._extensions
  }

  let foundExt = findCompilerExtension(extensions, entry)

  if (foundExt === "") {
    foundExt = ".js"
  }

  const mod = entry.module

  if (! mod.paths) {
    if (parentIsCJS ||
        parentIsPseudo ||
        (entry.package.options.cjs.paths &&
         ! parentIsMJS &&
         ext !== ".mjs")) {
      mod.paths = Module._nodeModulePaths(entry.dirname)
    } else {
      mod.paths = staticNodeModulePaths(entry.dirname)
    }
  }

  if (parsing &&
      foundExt !== ".cjs" &&
      foundExt !== ".js" &&
      foundExt !== ".json" &&
      foundExt !== ".mjs" &&
      foundExt !== ".wasm") {
    entry.state = STATE_PARSING_COMPLETED
    return
  }

  extensions[foundExt](mod, filename)

  if (! parsing &&
      ! mod.loaded) {
    mod.loaded = true
  }
}

export default loader
