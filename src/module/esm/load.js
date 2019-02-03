import ENTRY from "../../constant/entry.js"

import Entry from "../../entry.js"
import Loader from "../../loader.js"
import Module from "../../module.js"
import Package from "../../package.js"

import _load from "../internal/load.js"
import builtinLookup from "../../builtin-lookup.js"
import { dirname } from "../../safe/path.js"
import dualResolveFilename from "../internal/dual-resolve-filename.js"
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

function load(request, parent, isMain = false, preload) {
  const { parsing } = shared.moduleState
  const parentEntry = Entry.get(parent)
  const parentCJS = parentEntry === null ? null : parentEntry.package.options.cjs
  const parentIsESM = parentEntry === null ? false : parentEntry.type === TYPE_ESM
  const parentIsMJS = parentEntry === null ? false : parentEntry.extname === ".mjs"

  let filename

  if (parentEntry !== null &&
      parentCJS.paths &&
      ! parentIsMJS) {
    filename = dualResolveFilename(request, parent, isMain)
  } else {
    filename = resolveFilename(request, parent, isMain)
  }

  const fromPath = dirname(filename)

  if (fromPath === "." &&
      builtinLookup.has(filename)) {
    request = filename
  }

  const isExtMJS = isMJS(filename)
  const pkg = Package.from(filename)
  const { cjs } = pkg.options
  const queryFragment = getURLQueryFragment(request)
  const { moduleCache, scratchCache } = Loader.state.module

  let cache = Module._cache
  let isUnexposed = ! cjs.cache

  request = queryFragment === ""
    ? filename
    : getURLFromFilePath(filename) + queryFragment

  if (isExtMJS ||
      Reflect.has(moduleCache, request)) {
    cache = moduleCache
  } else if (parsing) {
    cache = scratchCache
  } else if (Reflect.has(scratchCache, request)) {
    const mod = scratchCache[request]

    if (isUnexposed &&
        Entry.get(mod).type === TYPE_ESM) {
      cache = moduleCache
    }

    cache[request] = mod
    Reflect.deleteProperty(scratchCache, request)
  }

  let loaderCalled = false

  const sanitize = (entry) => {
    const isESM = entry.type === TYPE_ESM

    if (! isESM) {
      isUnexposed = false
    }

    if (isMain &&
        isUnexposed) {
      Reflect.deleteProperty(realProcess, "mainModule")
    }

    if (! isESM &&
        (parentIsMJS ||
         (parentIsESM &&
          ! parentCJS.cache))) {
      entry.module.parent = void 0
    }
  }

  const entry = _load(request, parent, isMain, cache, (entry) => {
    loaderCalled = true

    cache[request] = entry.module

    if (parentEntry !== null) {
      parentEntry.children[entry.name] = entry
    }

    if (! parsing) {
      sanitize(entry)
    }

    if (typeof preload === "function") {
      preload(entry)
    }

    tryLoader(entry, filename, parentEntry, cache, request)
  })

  if (parsing) {
    sanitize(entry)
  }

  if (! loaderCalled &&
      typeof preload === "function") {
    preload(entry)
  }

  if (parentEntry !== null) {
    parentEntry._lastChild = entry
  }

  return entry
}

function tryLoader(entry, filename, parentEntry, cache, cacheKey) {
  let error
  let threw = true

  try {
    loader(entry, filename, parentEntry)
    threw = false
  } catch (e) {
    error = e
    throw e
  } finally {
    if (threw) {
      if (cache === Loader.state.module.moduleCache) {
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

export default load
