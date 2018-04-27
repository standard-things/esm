import ENTRY from "../../constant/entry.js"

import Module from "../../module.js"

import { extname } from "../../safe/path.js"
import isMJS from "../../util/is-mjs.js"
import moduleState from "../state.js"
import shared from "../../shared.js"

const {
  STATE_PARSING_COMPLETED
} = ENTRY

function loader(entry, filename, parentEntry, preload) {
  const { parsing } = shared.moduleState

  if (preload &&
      ! parsing) {
    preload(entry)
  }

  const mod = entry.module
  const parent = parentEntry && parentEntry.module

  let { _extensions } = moduleState
  let ext = extname(filename)

  if (ext === ".js" ||
      (parentEntry &&
       parentEntry.package.options.cjs.extensions &&
       ! isMJS(parent))) {
    _extensions = Module._extensions
  }

  if (ext === "" ||
      typeof _extensions[ext] !== "function") {
    ext = ".js"
  }

  if (parsing &&
      ext !== ".js" &&
      ext !== ".mjs") {
    entry.state = STATE_PARSING_COMPLETED
    return
  }

  _extensions[ext](mod, filename)

  if (! parsing) {
    mod.loaded = true
  }
}

export default loader
