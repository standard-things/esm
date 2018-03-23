import { dirname, extname } from "../../safe/path.js"

import ENTRY from "../../constant/entry.js"

import Entry from "../../entry.js"
import Module from "../../module.js"
import Package from "../../package.js"

import _load from "../_load.js"
import getQueryHash from "../../util/get-query-hash.js"
import getURLFromFilePath from "../../util/get-url-from-file-path.js"
import isError from "../../util/is-error.js"
import isMJS from "../../util/is-mjs.js"
import loader from "./loader.js"
import moduleNodeModulePaths from "../node-module-paths.js"
import moduleState from "../state.js"
import resolveFilename from "./resolve-filename.js"
import setGetter from "../../util/set-getter.js"
import setSetter from "../../util/set-setter.js"
import shared from "../../shared.js"
import toOptInError from "../../util/to-opt-in-error.js"

const {
  TYPE_ESM
} = ENTRY

function load(request, parent, isMain, preload) {
  const parentEntry = parent && Entry.get(parent)
  const parentPkg = parentEntry && parentEntry.package
  const parentPkgOptions = parentPkg && parentPkg.options
  const parentIsESM = parentEntry && parentEntry.type === TYPE_ESM
  const queryHash = getQueryHash(request)

  let filename

  if (parentPkgOptions &&
      parentPkgOptions.cjs.paths &&
      ! isMJS(parent)) {
    filename = tryResolveFilename(request, parent, isMain)
  } else {
    filename = resolveFilename(request, parent, isMain)
  }

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
    const { parsing, passthru } = shared.moduleState
    const child = entry.module

    state._cache[request] = child

    if (passthru &&
        ! parsing) {
      return
    }

    called = true

    child.filename = filename
    entry.id = request

    if (! parsing) {
      const isESM = entry.type === TYPE_ESM

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
      if (entry.package.options.cjs.paths &&
          ! isMJS(entry.module)) {
        child.paths = Module._nodeModulePaths(fromPath)
      } else {
        child.paths = moduleNodeModulePaths(fromPath)
      }
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

      setSetter(state._cache, request, (value) => {
        Reflect.defineProperty(state._cache, request, {
          __proto__: null,
          configurable: true,
          enumerable: true,
          value,
          writable: true
        })
      })
    }
  }
}

function tryResolveFilename(request, parent, isMain) {
  let error
  let result
  let threw = true

  try {
    result = Module._resolveFilename(request, parent, isMain)
    threw = false
  } catch (e) {
    error = e
  }

  if (threw) {
    try {
      result = resolveFilename(request, parent, isMain)
      threw = false
    } catch (e) {}
  }

  if (threw) {
    throw error
  }

  return result
}

export default load
