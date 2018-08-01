import ENTRY from "../../constant/entry.js"

import Entry from "../../entry.js"
import Module from "../../module.js"
import Package from "../../package.js"

import _load from "../internal/load.js"
import builtinLookup from "../../builtin-lookup.js"
import { dirname } from "../../safe/path.js"
import esmState from "./state.js"
import getURLFromFilePath from "../../util/get-url-from-file-path.js"
import getURLQueryFragment from "../../util/get-url-query-fragment.js"
import isMJS from "../../path/is-mjs.js"
import loader from "./loader.js"
import realProcess from "../../real/process.js"
import resolveFilename from "./resolve-filename.js"
import setProperty from "../../util/set-property.js"
import shared from "../../shared.js"

const {
  TYPE_ESM
} = ENTRY

function load(request, parent, isMain) {
  const { parsing } = shared.moduleState
  const parentEntry = parent && Entry.get(parent)
  const parentIsESM = parentEntry && parentEntry.type === TYPE_ESM
  const parentIsMJS = parentEntry && parentEntry.extname === ".mjs"
  const parentPkg = parentEntry && parentEntry.package
  const parentPkgOptions = parentPkg && parentPkg.options

  let filename

  if (parentPkgOptions &&
      parentPkgOptions.cjs.paths &&
      ! parentIsMJS) {
    filename = tryResolveFilename(request, parent, isMain)
  } else {
    filename = resolveFilename(request, parent, isMain)
  }

  const fromPath = dirname(filename)

  if (fromPath === "." &&
      Reflect.has(builtinLookup, filename)) {
    request = filename
  }

  const isExtMJS = isMJS(filename)
  const pkg = Package.from(filename)
  const queryFragment = getURLQueryFragment(request)
  const { moduleCache, scratchCache } = esmState

  let cache = Module._cache
  let isUnexposed = ! pkg.options.cjs.cache

  request = queryFragment
    ? getURLFromFilePath(filename) + queryFragment
    : filename

  if (isExtMJS ||
      Reflect.has(moduleCache, request)) {
    cache = moduleCache
  } else if (parsing) {
    cache = scratchCache
  } else if (Reflect.has(scratchCache, request)) {
    const child = scratchCache[request]

    if (isUnexposed &&
        Entry.get(child).type === TYPE_ESM) {
      cache = moduleCache
    }

    cache[request] = child
    Reflect.deleteProperty(scratchCache, request)
  }

  return _load(request, parent, isMain, cache, (entry) => {
    const child = entry.module

    cache[request] = child

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
          parentIsESM &&
          (parentIsMJS ||
           ! parentPkgOptions.cjs.cache)) {
        child.parent = void 0
      }
    }

    tryLoader(entry, cache, request, filename, parentEntry)
  })
}

function tryLoader(entry, cache, cacheKey, filename, parentEntry, preload) {
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
      if (cache === esmState.moduleCache) {
        // Unlike CJS, ESM errors are preserved for subsequent loads.
        Reflect.defineProperty(cache, cacheKey, {
          configurable: true,
          enumerable: true,
          get() {
            throw error
          },
          set(value) {
            setProperty(this, cacheKey, value)
          }
        })
      } else {
        Reflect.deleteProperty(cache, cacheKey)
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
