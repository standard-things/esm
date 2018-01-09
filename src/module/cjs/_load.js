// Based on Node's `Module._load` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Module from "../../module.js"

import _load from "../_load.js"
import loader from "./loader.js"

function load(request, parent, isMain, preload) {
  let called = false
  let entry = request

  if (typeof request === "string") {
    request = Module._resolveFilename(request, parent, isMain)
  }

  entry = _load(request, parent, isMain, Module, (entry) => {
    called = true
    return loader(entry, parent, preload)
  })

  if (! called &&
      preload) {
    preload(entry)
  }

  return entry
}

export default load
