import ENTRY from "../../constant/entry.js"

import Entry from "../../entry.js"
import Module from "../../module.js"
import Package from "../../package.js"

import _load from "../_load.js"
import builtinEntries from "../../builtin-entries.js"
import { dirname } from "../../safe/path.js"
import getURLFromFilePath from "../../util/get-url-from-file-path.js"
import getURLQueryFragment from "../../util/get-url-query-fragment.js"
import has from "../../util/has.js"
import isMJS from "../../util/is-mjs.js"
import loader from "./loader.js"
import moduleNodeModulePaths from "../node-module-paths.js"
import moduleState from "../state.js"
import parseState from "../../parse/state.js"
import realProcess from "../../real/process.js"
import resolveFilename from "./resolve-filename.js"
import setGetter from "../../util/set-getter.js"
import setSetter from "../../util/set-setter.js"
import shared from "../../shared.js"

const {
  TYPE_ESM
} = ENTRY

function load(request, parent, isMain, preload) {
  const { parseOnly, parsing } = shared.moduleState
  const parentEntry = parent && Entry.get(parent)
  const parentIsESM = parentEntry && parentEntry.type === TYPE_ESM
  const parentPkg = parentEntry && parentEntry.package
  const parentPkgOptions = parentPkg && parentPkg.options

  let filename

  if (parentPkgOptions &&
      parentPkgOptions.cjs.paths &&
      ! isMJS(parent)) {
    filename = tryResolveFilename(request, parent, isMain)
  } else {
    filename = resolveFilename(request, parent, isMain)
  }

  const fromPath = dirname(filename)

  if (fromPath === "." &&
      Reflect.has(builtinEntries, filename)) {
    request = filename
  }

  const isExtMJS = isMJS(filename)
  const pkg = Package.get(fromPath)
  const pkgOptions = pkg && pkg.options
  const queryFragment = getURLQueryFragment(request)

  let isUnexposed = pkgOptions && ! pkgOptions.cjs.cache
  let state = Module

  request = queryFragment
    ? getURLFromFilePath(filename) + queryFragment
    : filename

  if (isExtMJS ||
      has(moduleState._cache, request)) {
    state = moduleState
  } else if (parseOnly ||
      parsing) {
    state = parseState
  } else if (has(parseState._cache, request)) {
    const child = parseState._cache[request]

    if (isUnexposed &&
        Entry.get(child).type === TYPE_ESM) {
      state = moduleState
    }

    state._cache[request] = child
    Reflect.deleteProperty(parseState._cache, request)
  }

  let called = false

  const entry = _load(request, parent, isMain, state, (entry) => {
    const child = entry.module

    state._cache[request] = child

    entry.id = request
    child.filename = filename

    if (isMain) {
      child.id = "."
      moduleState.mainModule = child
    }

    if (parentEntry) {
      parentEntry.children[entry.name] = entry
    }

    if (! child.paths) {
      if (entry.package.options.cjs.paths &&
          ! isExtMJS) {
        child.paths = Module._nodeModulePaths(fromPath)
      } else {
        child.paths = moduleNodeModulePaths(fromPath)
      }
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
        child.parent = void 0
      }
    }

    if (parseOnly &&
        ! parsing) {
      return
    }

    called = true
    tryLoader(entry, state, request, filename, parentEntry, preload)
  })

  if (! called &&
      preload) {
    preload(entry)
  }

  return entry
}

function tryLoader(entry, state, cacheKey, filename, parentEntry, preload) {
  let error
  let threw = true

  try {
    loader(entry, filename, parentEntry, preload)
    threw = false
  } catch (e) {
    error = e
    throw e
  } finally {
    if (threw) {
      if (state === moduleState) {
        // Unlike CJS, ESM errors are preserved for subsequent loads.
        setGetter(state._cache, cacheKey, () => {
          throw error
        })

        setSetter(state._cache, cacheKey, function (value) {
          Reflect.defineProperty(this, cacheKey, {
            configurable: true,
            enumerable: true,
            value,
            writable: true
          })
        })
      } else {
        Reflect.deleteProperty(state._cache, cacheKey)
      }
    }
  }
}

function tryResolveFilename(request, parent, isMain) {
  let error

  try {
    return resolveFilename(request, parent, isMain)
  } catch (e) {
    error = e
  }

  try {
    return Module._resolveFilename(request, parent, isMain)
  } catch (e) {}

  throw error
}

export default load
