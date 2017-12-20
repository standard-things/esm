import Entry from "../../entry.js"
import Module from "../../module.js"
import PkgInfo from "../../pkg-info.js"

import _load from "../_load.js"
import _resolveFilename from "./_resolve-filename.js"
import { dirname } from "path"
import extname from "../../path/extname.js"
import getQueryHash from "../../util/get-query-hash.js"
import getURLFromFilePath from "../../util/get-url-from-file-path.js"
import isESM from "../../util/is-es-module.js"
import isError from "../../util/is-error.js"
import loader from "./loader.js"
import moduleResolveFilename from "../cjs/resolve-filename.js"
import moduleState from "../state.js"
import setGetter from "../../util/set-getter.js"
import toOptInError from "../../util/to-opt-in-error.js"

function load(id, parent, isMain, preload) {
  const parentPkgInfo = PkgInfo.from(parent)
  const parentOptions = parentPkgInfo && parentPkgInfo.options

  let filePath

  if (Module._resolveFilename !== moduleResolveFilename &&
      parentOptions && parentOptions.cjs.paths) {
    filePath = Module._resolveFilename(id, parent, isMain)
  } else {
    filePath = _resolveFilename(id, parent, isMain)
  }

  const fromPath = dirname(filePath)
  const pkgInfo = PkgInfo.get(fromPath)
  const pkgOptions = pkgInfo && pkgInfo.options

  let called = false
  let state = Module

  const queryHash = getQueryHash(id)
  const cacheId = filePath + queryHash

  if (! (pkgOptions && pkgOptions.cjs.cache)) {
    const ext = extname(filePath)
    isMain = false

    if (ext === ".mjs" ||
        (pkgOptions && pkgOptions.gz &&
         ext === ".mjs.gz")) {
      state = moduleState
    }
  }

  const isStateExposed = state === Module

  let child = isStateExposed
    ? state._cache[cacheId]
    : null

  if (child &&
      isESM(child.exports) &&
      ! Entry.has(child)) {
    delete state._cache[cacheId]
  }

  let error
  let threw = true

  try {
    child = _load(cacheId, parent, isMain, state, function () {
      called = true
      const url = getURLFromFilePath(filePath) + queryHash
      return loader.call(this, filePath, fromPath, url, parentOptions, preload)
    })

    if (! called &&
        preload) {
      called = true
      preload(child)
    }

    threw = false
  } catch (e) {
    error = e
  }

  if (! threw) {
    return child
  } else if (isError(error) &&
      error.code === "ERR_REQUIRE_ESM") {
    toOptInError(error)
  }

  try {
    throw error
  } finally {
    if (isStateExposed) {
      delete state._cache[cacheId]
    } else {
      // Unlike CJS, ESM errors are preserved for subsequent loads.
      setGetter(state._cache, cacheId, () => {
        throw error
      })
    }
  }
}

export default load
