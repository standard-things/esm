import { dirname, extname } from "../../safe/path.js"

import ENTRY from "../../constant/entry.js"

import Entry from "../../entry.js"
import Module from "../../module.js"
import Package from "../../package.js"

import _load from "../_load.js"
import builtinEntries from "../../builtin-entries.js"
import getURLFromFilePath from "../../util/get-url-from-file-path.js"
import getURLQueryFragment from "../../util/get-url-query-fragment.js"
import isMJS from "../../util/is-mjs.js"
import loader from "./loader.js"
import moduleNodeModulePaths from "../node-module-paths.js"
import moduleState from "../state.js"
import realProcess from "../../real/process.js"
import resolveFilename from "./resolve-filename.js"
import setGetter from "../../util/set-getter.js"
import setSetter from "../../util/set-setter.js"
import shared from "../../shared.js"

const {
  TYPE_ESM
} = ENTRY

function load(request, parent, isMain, preload) {
  const { parsing, passthru } = shared.moduleState
  const parentEntry = parent && Entry.get(parent)
  const parentPkg = parentEntry && parentEntry.package
  const parentPkgOptions = parentPkg && parentPkg.options
  const parentIsESM = parentEntry && parentEntry.type === TYPE_ESM

  let filename

  if (parentPkgOptions &&
      parentPkgOptions.cjs.paths &&
      ! isMJS(parent)) {
    filename = tryResolveFilename(request, parent, isMain)
  } else {
    filename = resolveFilename(request, parent, isMain)
  }

  const fromPath = dirname(filename)

  let entry

  if (fromPath === "." &&
      Reflect.has(builtinEntries, filename)) {
    entry = builtinEntries[filename]

    if (preload) {
      preload(entry)
    }

    return entry
  }

  const { parseState } = shared
  const pkg = Package.get(fromPath)
  const pkgOptions = pkg && pkg.options
  const queryFragment = getURLQueryFragment(request)

  let isUnexposed = ! (pkgOptions && pkgOptions.cjs.cache)
  let state = Module

  request = queryFragment
    ? getURLFromFilePath(filename) + queryFragment
    : filename

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

  entry = _load(request, parent, isMain, state, (entry) => {
    const mod = entry.module

    state._cache[request] = mod

    entry.id = request
    mod.filename = filename

    if (isMain) {
      mod.id = "."
      moduleState.mainModule = mod
    }

    if (parentEntry) {
      parentEntry.children[entry.name] = entry
    }

    if (! mod.paths) {
      if (entry.package.options.cjs.paths &&
          ! isMJS(entry.module)) {
        mod.paths = Module._nodeModulePaths(fromPath)
      } else {
        mod.paths = moduleNodeModulePaths(fromPath)
      }
    }

    if (passthru &&
        ! parsing) {
      return
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

    called = true

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

  try {
    return Module._resolveFilename(request, parent, isMain)
  } catch (e) {
    error = e
  }

  try {
    return resolveFilename(request, parent, isMain)
  } catch (e) {}

  throw error
}

export default load
