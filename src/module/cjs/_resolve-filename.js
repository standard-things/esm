// Based on Node's `Module._resolveFilename` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Module from "../../module.js"

import errors from "../../errors.js"
import getModuleName from "../../util/get-module-name.js"
import isObject from "../../util/is-object.js"
import shared from "../../shared.js"
import toStringLiteral from "../../util/to-string-literal.js"

const { isArray } = Array

function resolveFilename(request, parent, isMain, options) {
  if (typeof request !== "string") {
    throw new errors.TypeError("ERR_INVALID_ARG_TYPE", "request", "string")
  }

  const cacheKey = isObject(options)
    ? null
    : request + "\0" + getModuleName(parent) + "\0" + isMain

  if (cacheKey &&
      cacheKey in shared.resolveFilename) {
    return shared.resolveFilename[cacheKey]
  }

  let paths

  if (! cacheKey &&
      isArray(options.paths)) {
    const fakeParent = new Module("", null)
    const fromPaths = options.paths

    paths = []

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
  } else {
    paths = Module._resolveLookupPaths(request, parent, true)
  }

  const foundPath = Module._findPath(request, paths, isMain)

  if (foundPath) {
    return cacheKey
      ? shared.resolveFilename[cacheKey] = foundPath
      : foundPath
  }

  const error = new Error("Cannot find module " + toStringLiteral(request, "'"))
  error.code = "MODULE_NOT_FOUND"
  throw error
}

export default resolveFilename
