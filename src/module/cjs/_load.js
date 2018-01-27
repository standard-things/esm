// Based on Node's `Module._load` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Module from "../../module.js"

import _load from "../_load.js"
import { dirname } from "path"
import loader from "./loader.js"
import moduleState from "../state.js"

function load(request, parent, isMain, preload) {
  let called = false

  const filename = Module._resolveFilename(request, parent, isMain)

  const entry = _load(filename, parent, isMain, Module, (entry) => {
    const child = entry.module

    Module._cache[filename] = child

    if (moduleState.passthru) {
      return
    }

    called = true

    if (! child.paths) {
      child.paths = Module._nodeModulePaths(dirname(filename))
    }

    let threw = true

    try {
      loader(entry, preload)
      threw = false
    } finally {
      if (threw) {
        delete Module._cache[filename]
      }
    }
  })

  if (! called &&
      preload) {
    preload(entry)
  }

  return entry
}

export default load
