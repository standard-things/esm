// Based on Node's `internalModule.makeRequireFunction` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/module.js

import Module from "../module.js"

import errors from "../errors.js"
import loadCJS from "./cjs/load.js"
import moduleState from "./state.js"

function makeRequireFunction(mod, requirer, resolver) {
  const req = function require(request) {
    moduleState.requireDepth += 1

    try {
      if (typeof request !== "string") {
        throw new errors.TypeError("ERR_INVALID_ARG_TYPE", "request", "string")
      }

      return requirer.call(mod, request)
    } finally {
      moduleState.requireDepth -= 1
    }
  }

  function resolve(request, options) {
    return resolver.call(mod, request, options)
  }

  function paths(request) {
    return Module._resolveLookupPaths(request, mod, true)
  }

  if (typeof requirer !== "function") {
    requirer = (request) => loadCJS(request, mod, false)
  }

  if (typeof resolver !== "function") {
    resolver = (request, options) => Module._resolveFilename(request, mod, false, options)
  }

  resolve.paths = paths

  req.cache = Module._cache
  req.extensions = Module._extensions
  req.main = process.mainModule
  req.resolve = resolve

  return req
}

export default makeRequireFunction
