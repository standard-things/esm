// Based on `Module._load()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import ENTRY from "../../constant/entry.js"
import PACKAGE from "../../constant/package.js"

import Entry from "../../entry.js"
import Loader from "../../loader.js"
import Module from "../../module.js"
import RealModule from "../../real/module.js"

import _load from "../internal/load.js"
import errors from "../../errors.js"
import esmLoad from "../esm/load.js"
import has from "../../util/has.js"
import maskFunction from "../../util/mask-function.js"
import shared from "../../shared.js"
import validateString from "../../util/validate-string.js"

const {
  TYPE_ESM
} = ENTRY

const {
  MODE_STRICT
} = PACKAGE

const {
  ERR_REQUIRE_ESM
} = errors

const load = maskFunction(function (request, parent, isMain = false) {
  validateString(request, "request")

  const { parsing } = shared.moduleState
  const parentEntry = Entry.get(parent)

  if (parentEntry !== null &&
      parentEntry._passthruRequire) {
    parentEntry._passthruRequire = false
    return esmLoad(request, parent, isMain).module.exports
  }

  const parentIsStrict =
    parentEntry !== null &&
    parentEntry.package.options.mode === MODE_STRICT

  const filename = Module._resolveFilename(request, parent, isMain)
  const { scratchCache } = Loader.state.module

  let cache = Module._cache

  if (parsing) {
    cache = scratchCache
  } else if (has(scratchCache, filename)) {
    cache[filename] = scratchCache[filename]
    Reflect.deleteProperty(scratchCache, filename)
  }

  let loaderCalled = false

  const entry = _load(filename, parent, isMain, cache, (entry) => {
    loaderCalled = true
    cache[filename] = entry.module

    if (parentIsStrict ||
        entry.extname === ".mjs") {
      entry._passthruCompile = true
    }

    tryLoader(entry, cache, filename, filename)
  })

  if (! loaderCalled &&
      parentIsStrict &&
      entry.type === TYPE_ESM) {
    throw new ERR_REQUIRE_ESM(filename)
  }

  if (parentEntry !== null) {
    parentEntry._lastChild = entry
  }

  return entry.module.exports
}, RealModule._load)

function tryLoader(entry, cache, cacheKey, filename) {
  const mod = entry.module

  let threw = true

  try {
    mod.load(filename)
    threw = false
  } finally {
    entry._passthruCompile = false

    if (threw) {
      Reflect.deleteProperty(cache, cacheKey)
    }
  }
}

export default load
