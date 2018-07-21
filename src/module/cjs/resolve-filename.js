// Based on Node's `Module._resolveFilename`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import ENV from "../../constant/env.js"

import Module from "../../module.js"
import SafeModule from "../../safe/module.js"

import builtinLookup from "../../builtin-lookup.js"
import dirname from "../../path/dirname.js"
import errors from "../../errors.js"
import findPath from "../find-path.js"
import isAbsolute from "../../path/is-absolute.js"
import isObject from "../../util/is-object.js"
import isRelative from "../../path/is-relative.js"
import resolveLookupPaths from "../resolve-lookup-paths.js"
import shared from "../../shared.js"

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

  // Electron patches `Module._resolveFilename` to return its path.
  // https://github.com/electron/electron/blob/master/lib/common/reset-search-paths.js
  if (ELECTRON &&
      request === "electron") {
    return SafeModule._resolveFilename(request)
  }

  if (Reflect.has(builtinLookup, request)) {
    return request
  }

  const cache = shared.memoize.moduleCJSResolveFilename
  const isAbs = isAbsolute(request)
  const parentFilename = parent && parent.filename

  let fromPath

  if (! isAbs &&
      typeof parentFilename === "string") {
    fromPath = dirname(parentFilename)
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

  if (cacheKey &&
      Reflect.has(cache, cacheKey)) {
    return cache[cacheKey]
  }

  if (isAbs) {
    fromPath = dirname(request)
  }

  const isRel = ! isAbs && isRelative(request)
  const isPath = isAbs || isRel

  let paths

  if (isPath &&
      Module._findPath === findPath &&
      Module._resolveLookupPaths === resolveLookupPaths) {
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
