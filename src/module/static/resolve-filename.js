// Based on `Module._resolveFilename()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import ENTRY from "../../constant/entry.js"
import ENV from "../../constant/env.js"

import Entry from "../../entry.js"
import Loader from "../../loader.js"
import Module from "../../module.js"
import RealModule from "../../real/module.js"
import SafeModule from "../../safe/module.js"

import builtinLookup from "../../builtin-lookup.js"
import bundledLookup from "../../bundled-lookup.js"
import { dirname } from "../../safe/path.js"
import errors from "../../errors.js"
import isAbsolute from "../../path/is-absolute.js"
import isObject from "../../util/is-object.js"
import isRelative from "../../path/is-relative.js"
import maskFunction from "../../util/mask-function.js"
import maskStackTrace from "../../error/mask-stack-trace.js"
import shared from "../../shared.js"
import staticFindPath from "./find-path.js"
import staticResolveLookupPaths from "./resolve-lookup-paths.js"
import validateString from "../../util/validate-string.js"

const {
  TYPE_CJS,
  TYPE_PSEUDO
} = ENTRY

const {
  ELECTRON
} = ENV

const {
  MODULE_NOT_FOUND
} = errors

const resolveFilename = maskFunction(function (request, parent, isMain = false, options) {
  validateString(request, "request")

  // Electron and Muon patch `Module._resolveFilename()`.
  // https://github.com/electron/electron/blob/master/lib/common/reset-search-paths.js
  // https://github.com/brave/muon/blob/master/lib/common/reset-search-paths.js
  if (ELECTRON &&
      bundledLookup.has(request)) {
    return SafeModule._resolveFilename(request, parent, isMain, options)
  }

  if (builtinLookup.has(request)) {
    return request
  }

  const isAbs = isAbsolute(request)
  const parentEntry = Entry.get(parent)

  if (parentEntry !== null) {
    parentEntry.updateFilename()
  }

  let fromPath

  if (isAbs) {
    fromPath = dirname(request)
  } else {
    fromPath = parentEntry === null
      ? ""
      : parentEntry.dirname
  }

  let cache
  let cacheKey

  if (! isObject(options)) {
    cache = shared.memoize.moduleStaticResolveFilename

    cacheKey =
      request + "\0" +
      fromPath + "\0" +
      (isMain ? "1" : "")

    const cached = cache.get(cacheKey)

    if (cached !== void 0) {
      return cached
    }
  }

  const isRel = ! isAbs && isRelative(request)
  const isPath = isAbs || isRel

  let paths

  if (isPath &&
      Module._findPath === staticFindPath &&
      Module._resolveLookupPaths === staticResolveLookupPaths) {
    paths = [fromPath]
  } else if (cache === void 0 &&
             Array.isArray(options.paths)) {
    paths = resolveLookupPathsFrom(request, options.paths)
  } else {
    paths = Module._resolveLookupPaths(request, parent, true)
  }

  let foundPath = Module._findPath(request, paths, isMain)

  if (foundPath === false) {
    foundPath = ""
  }

  if (foundPath !== "") {
    if (cache !== void 0) {
      cache.set(cacheKey, foundPath)
    }

    return foundPath
  }

  const error = new MODULE_NOT_FOUND(request, parent)

  if (! Loader.state.package.default.options.debug) {
    const maskOptions = {
      filename: null,
      inModule: false
    }

    if (parentEntry !== null) {
      const parentType = parentEntry.type

      maskOptions.filename = parentEntry.filename

      maskOptions.inModule =
        (! parentEntry.package.options.cjs.paths ||
         parentEntry.extname === ".mjs") &&
        parentType !== TYPE_CJS &&
        parentType !== TYPE_PSEUDO
    }

    maskStackTrace(error, maskOptions)
  }

  throw error
}, RealModule._resolveFilename)

function resolveLookupPathsFrom(request, fromPaths) {
  const fakeParent = new Module("")
  const paths = []

  for (const fromPath of fromPaths) {
    fakeParent.paths = Module._nodeModulePaths(fromPath)

    const lookupPaths = Module._resolveLookupPaths(request, fakeParent, true)

    for (const lookupPath of lookupPaths) {
      if (paths.indexOf(lookupPath) === -1) {
        paths.push(lookupPath)
      }
    }
  }

  return paths
}

export default resolveFilename
