// Based on Node's `internalModule.makeRequireFunction` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/module.js

import Entry from "../entry.js"
import Module from "../module.js"

import errors from "../errors.js"
import getFilePathFromURL from "../util/get-file-path-from-url.js"
import isError from "../util/is-error.js"
import moduleState from "./state.js"

function makeRequireFunction(mod, requirer, resolver) {
  const req = function require(request) {
    moduleState.requireDepth += 1

    const entry = Entry.get(mod)

    if (! entry.package.options.cjs.vars) {
      try {
        return requirer.call(mod, request)
      } finally {
        moduleState.requireDepth -= 1
      }
    }

    try {
      return requirer.call(mod, request)
    } catch (e) {
      if (isError(e)) {
        const { code } = e

        if (code === "ERR_MODULE_RESOLUTION_LEGACY") {
          return Module._load(request, mod, false)
        }

        if (code === "ERR_MISSING_MODULE") {
          const { message } = e
          const url = message.slice(message.lastIndexOf(" ") + 1)
          throw new errors.Error("MODULE_NOT_FOUND", getFilePathFromURL(url))
        }
      }

      throw e
    } finally {
      moduleState.requireDepth -= 1
    }
  }

  function resolve(request, options) {
    if (typeof request !== "string") {
      throw new errors.Error("ERR_INVALID_ARG_TYPE", "request", "string", request)
    }

    return resolver.call(mod, request, options)
  }

  function paths(request) {
    if (typeof request !== "string") {
      throw new errors.Error("ERR_INVALID_ARG_TYPE", "request", "string", request)
    }

    return Module._resolveLookupPaths(request, mod, true)
  }

  if (typeof requirer !== "function") {
    requirer = (request) => mod.require(request)
  }

  if (typeof resolver !== "function") {
    resolver = (request, options) => Module._resolveFilename(request, mod, false, options)
  }

  req.cache = Module._cache
  req.extensions = Module._extensions
  req.main = process.mainModule
  req.resolve = resolve
  resolve.paths = paths

  return req
}

export default makeRequireFunction
