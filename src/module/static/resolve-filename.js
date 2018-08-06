// Based on Node's `Module._resolveFilename`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import ENV from "../../constant/env.js"

import Entry from "../../entry.js"
import Module from "../../module.js"
import SafeModule from "../../safe/module.js"

import builtinLookup from "../../builtin-lookup.js"
import bundledLookup from "../../bundled-lookup.js"
import { dirname } from "../../safe/path.js"
import errors from "../../errors.js"
import isAbsolute from "../../path/is-absolute.js"
import isObject from "../../util/is-object.js"
import isRelative from "../../path/is-relative.js"
import shared from "../../shared.js"
import staticFindPath from "./find-path.js"
import staticResolveLookupPaths from "./resolve-lookup-paths.js"

const {
  ELECTRON
} = ENV

const {
  ERR_INVALID_ARG_TYPE,
  MODULE_NOT_FOUND
} = errors

function resolveFilename(request, parent, isMain, options) {
  if (typeof request !== "string") {
    throw new ERR_INVALID_ARG_TYPE("request", "string")
  }

  // Electron and Muon patch `Module._resolveFilename`.
  // https://github.com/electron/electron/blob/master/lib/common/reset-search-paths.js
  // https://github.com/brave/muon/blob/master/lib/common/reset-search-paths.js
  if (ELECTRON &&
      Reflect.has(bundledLookup, request)) {
    return SafeModule._resolveFilename(request)
  }

  if (Reflect.has(builtinLookup, request)) {
    return request
  }

  const isAbs = isAbsolute(request)
  const parentEntry = parent && Entry.get(parent)

  let fromPath

  if (parentEntry) {
    parentEntry.updateFilename()
  }

  if (parentEntry &&
      ! isAbs) {
    fromPath = parentEntry.dirname
  } else {
    fromPath = ""
  }

  let cacheKey

  if (isObject(options)) {
    cacheKey = ""
  } else {
    cacheKey =
      request + "\0" +
      fromPath + "\0" +
      (isMain ? "1" : "")
  }

  const cache = shared.memoize.moduleStaticResolveFilename
  const cached = cacheKey && cache[cacheKey]

  if (cached) {
    return cached
  }

  if (isAbs) {
    fromPath = dirname(request)
  }

  const isRel = ! isAbs && isRelative(request)
  const isPath = isAbs || isRel

  let paths

  if (isPath &&
      Module._findPath === staticFindPath &&
      Module._resolveLookupPaths === staticResolveLookupPaths) {
    paths = [fromPath]
  } else if (! cacheKey &&
      Array.isArray(options.paths)) {
    paths = resolveLookupPathsFrom(request, options.paths)
  } else {
    paths = Module._resolveLookupPaths(request, parent, true)
  }

  const foundPath = Module._findPath(request, paths, isMain)

  if (foundPath) {
    return cacheKey
      ? cache[cacheKey] = foundPath
      : foundPath
  }

  throw new MODULE_NOT_FOUND(request)
}

function resolveLookupPathsFrom(request, fromPaths) {
  const fakeParent = new Module("")
  const paths = []

  for (const fromPath of fromPaths) {
    fakeParent.paths = Module._nodeModulePaths(fromPath)

    const lookupPaths = Module._resolveLookupPaths(request, fakeParent, true)

    if (paths.indexOf(fromPath) === -1) {
      paths.push(fromPath)
    }

    for (const lookupPath of lookupPaths) {
      if (paths.indexOf(lookupPath) === -1) {
        paths.push(lookupPath)
      }
    }
  }

  return paths
}

export default resolveFilename
