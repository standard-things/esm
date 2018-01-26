import Entry from "../../entry.js"
import Module from "../../module.js"
import Package from "../../package.js"

import _load from "../_load.js"
import { dirname } from "path"
import extname from "../../path/extname.js"
import getQueryHash from "../../util/get-query-hash.js"
import getURLFromFilePath from "../../util/get-url-from-file-path.js"
import isError from "../../util/is-error.js"
import loader from "./loader.js"
import moduleNodeModulePaths from "../node-module-paths.js"
import moduleState from "../state.js"
import resolveFilename from "./resolve-filename.js"
import setGetter from "../../util/set-getter.js"
import toOptInError from "../../util/to-opt-in-error.js"

function load(request, parent, isMain, preload) {
  let cacheKey
  let filename
  let queryHash
  let entry = request

  if (typeof request === "string") {
    filename = parent && Entry.get(parent).package.options.cjs.paths
      ? Module._resolveFilename(request, parent, isMain)
      : resolveFilename(request, parent, isMain)

    queryHash = getQueryHash(request)

    cacheKey =
    request = filename + queryHash
  } else {
    filename = entry.module.filename
  }

  const fromPath = dirname(filename)
  const pkg = Package.get(fromPath)
  const pkgOptions = pkg && pkg.options
  const isUnexposed = ! (pkgOptions && pkgOptions.cjs.cache)

  let childIsMain = isMain
  let state = Module

  if (isUnexposed) {
    const ext = extname(filename)
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

      if (! child.paths) {
        child.paths = entry.package.options.cjs.paths
          ? Module._nodeModulePaths(fromPath)
          : moduleNodeModulePaths(fromPath)
      }

      if (! entry.url) {
        child.filename = filename
        entry.cacheKey = cacheKey
        entry.url = getURLFromFilePath(filename) + queryHash

        if (isUnexposed) {
          child.parent = void 0
        }
      }

      if (isMain) {
        moduleState.mainModule = child
        child.id = "."
      }

      return loader(entry, preload)
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
