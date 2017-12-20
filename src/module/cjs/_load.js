import Module from "../../module.js"

import _load from "../_load.js"
import loader from "./loader.js"

function load(id, parent, isMain, preload) {
  let called = false

  const filePath = Module._resolveFilename(id, parent, isMain)

  const child = _load(filePath, parent, isMain, Module, function () {
    called = true
    return loader.call(this, filePath, parent, preload)
  })

  if (! called &&
      preload) {
    called = true
    preload(child)
  }

  return child
}

export default load
