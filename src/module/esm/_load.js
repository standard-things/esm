import Entry from "../../entry.js"
import Module from "../../module.js"
import PkgInfo from "../../pkg-info.js"

import _load from "../_load.js"
import { dirname } from "path"
import extname from "../../path/extname.js"
import getQueryHash from "../../util/get-query-hash.js"
import getURLFromFilePath from "../../util/get-url-from-file-path.js"
import isError from "../../util/is-error.js"
import loader from "./loader.js"
import moduleState from "../state.js"
import resolveFilename from "./resolve-filename.js"
import setGetter from "../../util/set-getter.js"
import toOptInError from "../../util/to-opt-in-error.js"

function load(request, parent, isMain, preload) {
  let cacheKey
  let filePath
  let parentOptions
  let queryHash
  let entry = request

  if (typeof request === "string") {
    const parentEntry = Entry.get(parent)
    parentOptions = parentEntry && parentEntry.options
    queryHash = getQueryHash(request)

    filePath = parentOptions && parentOptions.cjs.paths
      ? Module._resolveFilename(request, parent, isMain)
      : resolveFilename(request, parent, isMain)

    cacheKey =
    request = filePath + queryHash
  } else {
    filePath = entry.filePath
  }

  const fromPath = dirname(filePath)
  const pkgInfo = PkgInfo.get(fromPath)
  const pkgOptions = pkgInfo && pkgInfo.options
  const isUnexposed = ! (pkgOptions && pkgOptions.cjs.cache)

  let childIsMain = isMain
  let state = Module

  if (isUnexposed) {
    const ext = extname(filePath)
    childIsMain = false

    if (ext === ".mjs" ||
        (pkgOptions && pkgOptions.gz &&
        ext === ".mjs.gz")) {
      state = moduleState
    }
  }

  let error
  let called = false
  let threw = true

  try {
    entry = _load(request, parent, childIsMain, state, (childEntry) => {
      called = true
      entry = childEntry
      const child = entry.module

      if (! entry.url) {
        child.filename =
        entry.filePath = filePath
        entry.cacheKey = cacheKey
        entry.url = getURLFromFilePath(filePath) + queryHash

        if (isUnexposed) {
          child.parent = void 0
        }
      }

      if (isMain) {
        moduleState.mainModule = child
        child.id = "."
      }

      return loader(entry, fromPath, parentOptions, preload)
    })

    if (! called &&
        preload) {
      preload(entry)
    }

    threw = false
  } catch (e) {
    error = e
  }

  if (! threw) {
    return entry
  } else if (isError(error) &&
      error.code === "ERR_REQUIRE_ESM") {
    toOptInError(error)
  }

  try {
    throw error
  } finally {
    if (state === Module) {
      delete state._cache[entry.cacheKey]
    } else {
      // Unlike CJS, ESM errors are preserved for subsequent loads.
      setGetter(state._cache, entry.cacheKey, () => {
        throw error
      })
    }
  }
}

export default load
