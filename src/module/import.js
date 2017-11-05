import builtinEntries from "../builtin-entries.js"
import { extname } from "path"
import isESM from "../util/is-es-module.js"
import moduleState from "./state.js"

function moduleImport(id, parent, loader, options, preload) {
  if (id in builtinEntries) {
    const child = builtinEntries[id]

    if (preload) {
      preload(child)
    }

    return child
  }

  const child = loader(id, parent, false, options, preload)
  const { filename } = child

  if (! options.cjs &&
      isESM(child.exports)) {
    if (extname(filename) === ".mjs") {
      delete __non_webpack_require__.cache[filename]
    }
  } else {
    delete moduleState.cache[filename]
  }

  return child
}

export default moduleImport
