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
  const filename = parent && Entry.get(parent).package.options.cjs.paths
    ? Module._resolveFilename(request, parent, isMain)
    : resolveFilename(request, parent, isMain)

  const queryHash = getQueryHash(request)

  request = filename + queryHash

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
  let threw = false

  const entry = _load(request, parent, childIsMain, state, (entry) => {
    const child = entry.module

    state._cache[request] = child

    if (moduleState.passthru &&
        ! moduleState.parsing) {
      return
    }

    called = true

    if (! child.paths) {
      child.paths = entry.package.options.cjs.paths
        ? Module._nodeModulePaths(fromPath)
        : moduleNodeModulePaths(fromPath)
    }

    if (! entry.url) {
      child.filename = filename
      entry.id = request
      entry.url = getURLFromFilePath(filename) + queryHash

      if (isUnexposed) {
        child.parent = void 0
      }
    }

    if (isMain) {
      moduleState.mainModule = child
      child.id = "."
    }

    try {
      loader(entry, preload)
    } catch (e) {
      error = e
      threw = true
      delete state._cache[request]
    }
  })

  if (! called &&
      preload) {
    preload(entry)
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
      delete state._cache[request]
    } else {
      // Unlike CJS, ESM errors are preserved for subsequent loads.
      setGetter(state._cache, request, () => {
        throw error
      })
    }
  }
}

export default load
