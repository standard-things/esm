// Based on Node's `internalModule.makeRequireFunction` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/module.js

import ENTRY from "../constant/entry.js"

import Entry from "../entry.js"
import Module from "../module.js"

import errors from "../errors.js"
import isDataProperty from "../util/is-data-property.js"
import isError from "../util/is-error.js"
import isInstalled from "../util/is-installed.js"
import maskFunction from "../util/mask-function.js"
import moduleState from "./state.js"
import shared from "../shared.js"

const {
  TYPE_ESM
} = ENTRY

const {
  ERR_INVALID_ARG_TYPE
} = errors

const sourceResolve = __non_webpack_require__.resolve
const sourcePaths = sourceResolve && sourceResolve.paths

function makeRequireFunction(mod, requirer, resolver) {
  const entry = Entry.get(mod)
  const isESM = entry.type == TYPE_ESM
  const { name } = entry

  let req = function require(request) {
    moduleState.requireDepth += 1

    shared.entry.skipExports[name] =
      ! isESM &&
      ! isDataProperty(mod, "exports")

    let exported

    if (! entry.package.options.cjs.vars) {
      try {
        exported = requirer.call(mod, request)
      } finally {
        moduleState.requireDepth -= 1
      }
    }

    try {
      exported = requirer.call(mod, request)
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

    return exported
  }

  function resolve(request, options) {
    if (typeof request !== "string") {
      throw new ERR_INVALID_ARG_TYPE("request", "string", request)
    }

    return resolver.call(mod, request, options)
  }

  function paths(request) {
    if (typeof request !== "string") {
      throw new ERR_INVALID_ARG_TYPE("request", "string", request)
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

  if (! isInstalled(mod)) {
    resolve.paths = maskFunction(paths, sourcePaths)
    req.resolve = maskFunction(resolve, sourceResolve)
    req = maskFunction(req, __non_webpack_require__)
  }

  return req
}

export default makeRequireFunction
