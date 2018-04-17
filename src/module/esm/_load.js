import { dirname, extname } from "../../safe/path.js"

import ENTRY from "../../constant/entry.js"

import Entry from "../../entry.js"
import Module from "../../module.js"
import Package from "../../package.js"

import _load from "../_load.js"
import getHash from "../../util/get-hash.js"
import getQuery from "../../util/get-query.js"
import getURLFromFilePath from "../../util/get-url-from-file-path.js"
import isError from "../../util/is-error.js"
import isMJS from "../../util/is-mjs.js"
import loader from "./loader.js"
import moduleNodeModulePaths from "../node-module-paths.js"
import moduleState from "../state.js"
import realProcess from "../../real/process.js"
import resolveFilename from "./resolve-filename.js"
import setGetter from "../../util/set-getter.js"
import setSetter from "../../util/set-setter.js"
import shared from "../../shared.js"
import toOptInError from "../../util/to-opt-in-error.js"

const {
  TYPE_ESM
} = ENTRY

function load(request, parent, isMain, preload) {
  const { parsing, passthru } = shared.moduleState
  const parentEntry = parent && Entry.get(parent)
  const parentPkg = parentEntry && parentEntry.package
  const parentPkgOptions = parentPkg && parentPkg.options
  const parentIsESM = parentEntry && parentEntry.type === TYPE_ESM
  const { parseState } = shared
  const requestHash = getHash(request)
  const requestQuery = getQuery(request)

  let filename

  if (parentPkgOptions &&
      parentPkgOptions.cjs.paths &&
      ! isMJS(parent)) {
    filename = tryResolveFilename(request, parent, isMain)
  } else {
    filename = resolveFilename(request, parent, isMain)
  }

  request = filename + requestQuery + requestHash

  const fromPath = dirname(filename)
  const pkg = Package.get(fromPath)
  const pkgOptions = pkg && pkg.options

  let isUnexposed = ! (pkgOptions && pkgOptions.cjs.cache)
  let state = Module

  if (isUnexposed &&
      extname(filename) === ".mjs") {
    state = moduleState
  } else if (parsing) {
    state = parseState
  } else if (Reflect.has(parseState._cache, request)) {
    Module._cache[request] = parseState._cache[request]
    Reflect.deleteProperty(parseState._cache, request)
  }

  let error
  let called = false
  let threw = false

  const entry = _load(request, parent, isMain, state, (entry) => {
    const mod = entry.module

    state._cache[request] = mod

    if (passthru &&
        ! parsing) {
      return
    }

    called = true

    mod.filename = filename
    entry.id = request

    if (isMain) {
      mod.id = "."
      moduleState.mainModule = mod
    }

    if (parentEntry) {
      parentEntry.children[entry.name] = entry
    }

    if (! parsing) {
      const isESM = entry.type === TYPE_ESM

      if (! isESM) {
        isUnexposed = false
      }

      if (isMain &&
          isUnexposed) {
        Reflect.deleteProperty(realProcess, "mainModule")
      }

      if (! isESM &&
          (parentIsESM &&
           ! parentPkgOptions.cjs.cache)) {
        mod.parent = void 0
      }
    }

    if (! mod.paths) {
      if (entry.package.options.cjs.paths &&
          ! isMJS(entry.module)) {
        mod.paths = Module._nodeModulePaths(fromPath)
      } else {
        mod.paths = moduleNodeModulePaths(fromPath)
      }
    }

    if (! entry.url) {
      entry.url = getURLFromFilePath(filename) + requestQuery
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
    if (state !== moduleState) {
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
