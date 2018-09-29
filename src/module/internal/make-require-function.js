// Based on `makeRequireFunction()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/helpers.js

import ENTRY from "../../constant/entry.js"
import ESM from "../../constant/esm.js"

import Entry from "../../entry.js"
import Module from "../../module.js"
import Runtime from "../../runtime.js"

import errors from "../../errors.js"
import isDataProperty from "../../util/is-data-property.js"
import isInstalled from "../../util/is-installed.js"
import maskFunction from "../../util/mask-function.js"
import realGetProxyDetails from "../../real/get-proxy-details.js"
import realProcess from "../../real/process.js"
import realRequire from "../../real/require.js"
import shared from "../../shared.js"

const {
  TYPE_ESM
} = ENTRY

const {
  PKG_DIRNAME
} = ESM

const {
  ERR_INVALID_ARG_TYPE
} = errors

const sourceResolve = realRequire.resolve
const sourcePaths = sourceResolve && sourceResolve.paths
const { symbol } = shared

const ownExports = {
  __proto__: null,
  [symbol.entry]: Entry,
  [symbol.realGetProxyDetails]: realGetProxyDetails,
  [symbol.realRequire]: realRequire,
  [symbol.runtime]: Runtime,
  [symbol.shared]: shared
}

function makeRequireFunction(mod, requirer, resolver) {
  const entry = Entry.get(mod)
  const isESM = entry.type === TYPE_ESM
  const isOwn = isOwnModule(mod)
  const { name } = entry

  let req = function require(request) {
    if (isOwn) {
      const exported = ownRequire(request)

      if (exported) {
        return exported
      }
    }

    const { moduleState } = shared

    shared.entry.skipExports[name] =
      ! isESM &&
      ! isDataProperty(mod, "exports")

    moduleState.requireDepth += 1

    try {
      return requirer.call(mod, request)
    } finally {
      moduleState.requireDepth -= 1
    }
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
  req.main = realProcess.mainModule
  req.resolve = resolve
  resolve.paths = paths

  if (! isInstalled(mod)) {
    resolve.paths = maskFunction(paths, sourcePaths)
    req.resolve = maskFunction(resolve, sourceResolve)
    req = maskFunction(req, realRequire)
  }

  return req
}

function isOwnModule(mod) {
  const { filename } = mod

  return typeof filename === "string" &&
    filename.startsWith(PKG_DIRNAME)
}

function ownRequire(request) {
  if (typeof request === "symbol") {
    return ownExports[request]
  }
}

export default makeRequireFunction
