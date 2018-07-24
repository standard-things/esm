import ENTRY from "../../constant/entry.js"

import Module from "../../module.js"

import esmState from "./state.js"
import shared from "../../shared.js"

const {
  STATE_PARSING_COMPLETED
} = ENTRY

function loader(entry, filename, parentEntry, preload) {
  const { parsing } = shared.moduleState

  entry.updateFilename(filename)

  if (preload &&
      ! parsing) {
    preload(entry)
  }

  let ext = entry.extname
  let state = esmState

  if (ext === ".js" ||
      (parentEntry &&
       parentEntry.package.options.cjs.extensions &&
       parentEntry.extname !== ".mjs")) {
    state = Module
  }

  if (ext === "" ||
      ! Reflect.has(state._extensions, ext)) {
    ext = ".js"
  }

  if (parsing &&
      ext !== ".js" &&
      ext !== ".mjs") {
    entry.state = STATE_PARSING_COMPLETED
    return
  }

  const mod = entry.module

  state._extensions[ext](mod, filename)

  if (! parsing &&
      ! mod.loaded) {
    mod.loaded = true
  }
}

export default loader
