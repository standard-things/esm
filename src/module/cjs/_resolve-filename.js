// Based on Node's `Module._resolveFilename` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import GenericArray from "../../generic/array.js"
import Module from "../../module.js"

import errors from "../../errors.js"
import getModuleName from "../../util/get-module-name.js"
import isObject from "../../util/is-object.js"
import shared from "../../shared.js"

function resolveFilename(request, parent, isMain, options) {
  if (typeof request !== "string") {
    throw new errors.TypeError("ERR_INVALID_ARG_TYPE", "request", "string")
  }

  const cache = shared.resolveFilename
  const cacheKey = isObject(options)
    ? null
    : request + "\0" + getModuleName(parent) + "\0" + isMain

  if (cacheKey &&
      cacheKey in cache) {
    return cache[cacheKey]
  }

  let paths

  if (! cacheKey &&
      GenericArray.isArray(options.paths)) {
    const fakeParent = new Module("", null)
    const fromPaths = options.paths

    paths = []

    for (const fromPath of fromPaths) {
      fakeParent.paths = Module._nodeModulePaths(fromPath)
      const lookupPaths = Module._resolveLookupPaths(request, fakeParent, true)

      if (GenericArray.indexOf(paths, fromPath) === -1) {
        GenericArray.push(paths, fromPath)
      }

      for (const lookupPath of lookupPaths) {
        if (GenericArray.indexOf(paths, lookupPath) === -1) {
          GenericArray.push(paths, lookupPath)
        }
      }
    }
  } else {
    paths = Module._resolveLookupPaths(request, parent, true)
  }

  const foundPath = Module._findPath(request, paths, isMain)

  if (foundPath) {
    return cacheKey
      ? cache[cacheKey] = foundPath
      : foundPath
  }

  throw new errors.Error("MODULE_NOT_FOUND", request)
}

export default resolveFilename
