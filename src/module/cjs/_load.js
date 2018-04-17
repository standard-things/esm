// Based on Node's `Module._load`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import Module from "../../module.js"

import _load from "../_load.js"
import { dirname } from "../../safe/path.js"
import loader from "./loader.js"
import shared from "../../shared.js"

function load(request, parent, isMain, preload) {
  let called = false

  const { parsing, passthru } = shared.moduleState
  const filename = Module._resolveFilename(request, parent, isMain)
  const state = parsing ? shared.parseState : Module

  const entry = _load(filename, parent, isMain, state, (entry) => {
    const mod = entry.module

    state._cache[filename] = mod

    if (passthru &&
        ! parsing) {
      return
    }

    called = true

    if (! mod.paths) {
      mod.paths = Module._nodeModulePaths(dirname(filename))
    }

    let threw = true

    try {
      loader(entry, preload)
      threw = false
    } finally {
      if (threw) {
        Reflect.deleteProperty(state._cache, filename)
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
