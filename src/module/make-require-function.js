// Based on Node's `internalModule.makeRequireFunction` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/module.js

import Entry from "../entry.js"
import GenericFunction from "../generic/function.js"
import Module from "../module.js"

import errors from "../errors.js"
import isDataProperty from "../util/is-data-property.js"
import isError from "../util/is-error.js"
import moduleState from "./state.js"
import shared from "../shared.js"

function makeRequireFunction(mod, requirer, resolver) {
  const entry = Entry.get(mod)
  const cached = entry.package.cache.compile[entry.cacheName]
  const isESM = cached && cached.esm
  const { name } = entry

  const req = function require(request) {
    moduleState.requireDepth += 1

    shared.entry.skipExports[name] =
      ! isESM &&
      ! isDataProperty(mod, "exports")

    if (! entry.package.options.cjs.vars) {
      try {
        return GenericFunction.call(requirer, mod, request)
      } finally {
        moduleState.requireDepth -= 1
      }
    }

    try {
      return GenericFunction.call(requirer, mod, request)
    } catch (e) {
      if (isError(e)) {
        const { code } = e

        if (code === "ERR_MODULE_RESOLUTION_LEGACY") {
          return Module._load(request, mod, false)
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

    return GenericFunction.call(resolver, mod, request, options)
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
