import { dirname, extname } from "path"

import Entry from "../../entry.js"
import Module from "../../module.js"
import Package from "../../package.js"

import _load from "../_load.js"
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
  const parentEntry = parent && Entry.get(parent)
  const parentPkg = parentEntry && parentEntry.package
  const parentPkgOptions = parentPkg && parentPkg.options
  const parentCached = parentPkg && parentPkg.cache.compile[parentEntry.cacheName]
  const parentIsESM = parentCached && parentCached.sourceType === "module"

  const filename = parentPkgOptions && parentPkgOptions.cjs.paths
    ? Module._resolveFilename(request, parent, isMain)
    : resolveFilename(request, parent, isMain)

  const queryHash = getQueryHash(request)

  request = filename + queryHash

  const fromPath = dirname(filename)
  const pkg = Package.get(fromPath)
  const pkgOptions = pkg && pkg.options

  let isUnexposed = ! (pkgOptions && pkgOptions.cjs.cache)
  let state = Module

  if (isUnexposed &&
      extname(filename) === ".mjs") {
    state = moduleState
  }

  let error
  let called = false
  let threw = false

  const entry = _load(request, parent, isMain, state, (entry) => {
    const child = entry.module
    const pkg = entry.package

    state._cache[request] = child

    if (moduleState.passthru &&
        ! moduleState.parsing) {
      return
    }

    called = true

    child.filename = filename
    entry.id = request

    if (! moduleState.parsing) {
      const cached = pkg.cache.compile[entry.cacheName]
      const isESM = cached && cached.sourceType === "module"

      if (! isESM) {
        isUnexposed = false
      }

      if (isMain) {
        child.id = "."
        moduleState.mainModule = child

        if (isUnexposed) {
          Reflect.deleteProperty(process, "mainModule")
        }
      }

      if (! isESM &&
          (parentIsESM &&
           ! parentPkgOptions.cjs.cache)) {
        child.parent = void 0
      }
    }

    if (! child.paths) {
      child.paths = pkg.options.cjs.paths
        ? Module._nodeModulePaths(fromPath)
        : moduleNodeModulePaths(fromPath)
    }

    if (! entry.url) {
      entry.url = getURLFromFilePath(filename) + queryHash
    }

    try {
      loader(entry, preload)
    } catch (e) {
      error = e
      threw = true
      Reflect.deleteProperty(state._cache, request)
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
      Reflect.deleteProperty(state._cache, request)
    } else {
      // Unlike CJS, ESM errors are preserved for subsequent loads.
      setGetter(state._cache, request, () => {
        throw error
      })
    }
  }
}

export default load
