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
  const { parseOnly, parsing } = shared.moduleState
  const parentEntry = parent && Entry.get(parent)

  if (parentEntry &&
      parentEntry._require === TYPE_ESM) {
    parentEntry._require = TYPE_CJS
    return _loadESM(request, parent, isMain).module.exports
  }

  const filename = Module._resolveFilename(request, parent, isMain)

  let state = Module

  if (parseOnly ||
      parsing) {
    state = parseState
  } else if (Reflect.has(parseState._cache, filename)) {
    state._cache[filename] = parseState._cache[filename]
    Reflect.deleteProperty(parseState._cache, filename)
  }

  let loaderCalled = false

  const entry = _load(filename, parent, isMain, state, (entry) => {
    const child = entry.module

    state._cache[filename] = child

    if (! child.paths) {
      child.paths = Module._nodeModulePaths(dirname(filename))
    }

    if (parseOnly &&
        ! parsing) {
      return
    }

    loaderCalled = true
    tryLoader(entry, state, filename, filename, parentEntry, preload)
  })

  if (! loaderCalled) {
    if (parentEntry &&
        entry.type === TYPE_ESM &&
        parentEntry.package.options.mode === OPTIONS_MODE_STRICT) {
      throw new ERR_REQUIRE_ESM(filename)
    }

    if (preload) {
      preload(entry)
    }
  }

  return entry.module.exports
}

function tryLoader(entry, state, cacheKey, filename, parentEntry, preload) {
  let threw = true

  try {
    loader(entry, filename, parentEntry, preload)
    threw = false
  } finally {
    if (threw) {
      Reflect.deleteProperty(state._cache, cacheKey)
    }
  }
}

export default load
