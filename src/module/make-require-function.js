// Based on Node's `internalModule.makeRequireFunction` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/module.js

import Module from "../module.js"

import moduleState from "./state.js"

function makeRequireFunction(mod, requirer, resolver) {
  function require(request) {
    moduleState.requireDepth += 1

    try {
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
    requirer = (request) => mod.require(request)
  }

  if (typeof resolver !== "function") {
    resolver = (request, options) => Module._resolveFilename(request, mod, false, options)
  }

  require.cache = Module._cache
  require.extensions = Module._extensions
  require.main = process.mainModule
  require.resolve = resolve
  resolve.paths = paths

  return require
}

export default makeRequireFunction
