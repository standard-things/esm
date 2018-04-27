// Based on Node's `Module._load`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import ENTRY from "../../constant/entry.js"
import PACKAGE from "../../constant/package.js"

import Entry from "../../entry.js"
import Module from "../../module.js"

import _load from "../_load.js"
import _loadESM from "../esm/_load.js"
import { dirname } from "../../safe/path.js"
import errors from "../../errors.js"
import has from "../../util/has.js"
import loader from "./loader.js"
import parseState from "../../parse/state.js"
import shared from "../../shared.js"

const {
  TYPE_CJS,
  TYPE_ESM
} = ENTRY

const {
  OPTIONS_MODE_STRICT
} = PACKAGE

const {
  ERR_REQUIRE_ESM
} = errors

function load(request, parent, isMain, preload) {
  const parentEntry = parent && Entry.get(parent)

  if (parentEntry &&
      parentEntry._require === TYPE_ESM) {
    parentEntry._require = TYPE_CJS
    return _loadESM(request, parent, isMain).module.exports
  }

  const { parseOnly, parsing } = shared.moduleState
  const filename = Module._resolveFilename(request, parent, isMain)

  let state = Module

  if (parseOnly ||
      parsing) {
    state = parseState
  } else if (has(parseState._cache, filename)) {
    state._cache[filename] = parseState._cache[filename]
    Reflect.deleteProperty(parseState._cache, filename)
  }

  let called = false

  const entry = _load(filename, parent, isMain, state, (entry) => {
    const mod = entry.module

    state._cache[filename] = mod

    if (! mod.paths) {
      mod.paths = Module._nodeModulePaths(dirname(filename))
    }

    if (parseOnly &&
        ! parsing) {
      return
    }

    called = true

    let threw = true

    try {
      loader(entry, filename, parentEntry, preload)
      threw = false
    } finally {
      if (threw) {
        Reflect.deleteProperty(state._cache, filename)
      }
    }
  })

  if (! called) {
    if (parent &&
        entry.type === TYPE_ESM &&
        Entry.get(parent).package.options.mode === OPTIONS_MODE_STRICT) {
      throw new ERR_REQUIRE_ESM(filename)
    }

    if (preload) {
      preload(entry)
    }
  }

  return entry.module.exports
}

export default load
