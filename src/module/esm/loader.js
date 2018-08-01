import ENTRY from "../../constant/entry.js"

import Module from "../../module.js"

import esmState from "./state.js"
import shared from "../../shared.js"
import staticNodeModulePaths from "../static/node-module-paths.js"

const {
  STATE_PARSING_COMPLETED
} = ENTRY

function loader(entry, filename, parentEntry) {
  const { parsing } = shared.moduleState

  entry.updateFilename(filename)

  let ext = entry.extname
  let { extensions } = esmState

  if (ext === ".js" ||
      (parentEntry &&
       parentEntry.package.options.cjs.extensions &&
       parentEntry.extname !== ".mjs")) {
    extensions = Module._extensions
  }

  if (ext === "" ||
      ! Reflect.has(extensions, ext)) {
    ext = ".js"
  }

  const mod = entry.module

  if (parsing) {
    if (entry.package.options.cjs.paths &&
        ext !== ".mjs") {
      mod.paths = Module._nodeModulePaths(entry.dirname)
    } else {
      mod.paths = staticNodeModulePaths(entry.dirname)
    }

    if (ext !== ".js" &&
        ext !== ".mjs") {
      entry.state = STATE_PARSING_COMPLETED
      return
    }
  }

  extensions[ext](mod, filename)

  if (! parsing &&
      ! mod.loaded) {
    mod.loaded = true
  }
}

export default loader
