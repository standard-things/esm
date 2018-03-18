import ENTRY from "../../constant/entry.js"

import Module from "../../module.js"

import { extname } from "../../safe/path.js"
import isMJS from "../../util/is-mjs.js"
import moduleState from "../state.js"

const {
  STATE_PARSING_COMPLETED
} = ENTRY

function loader(entry, preload) {
  if (! moduleState.parsing &&
      preload) {
    preload(entry)
  }

  const mod = entry.module
  const { filename } = mod
  const { parent } = entry

  let { _extensions } = moduleState
  let ext = extname(filename)

  if (ext === ".js" ||
      (parent &&
       parent.package.options.cjs.extensions &&
       ! isMJS(parent))) {
    _extensions = Module._extensions
  }

  if (ext === "" ||
      typeof _extensions[ext] !== "function") {
    ext = ".js"
  }

  if (moduleState.parsing &&
      (ext === ".json" ||
       ext === ".node")) {
    entry.state = STATE_PARSING_COMPLETED
    return
  }

  _extensions[ext](mod, filename)

  if (! moduleState.parsing) {
    mod.loaded = true
  }
}

export default loader
