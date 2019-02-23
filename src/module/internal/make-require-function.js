// Based on `makeRequireFunction()`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/helpers.js

import Entry from "../../entry.js"
import Module from "../../module.js"
import Runtime from "../../runtime.js"

import isInstalled from "../../util/is-installed.js"
import isOwnModule from "../../util/is-own-module.js"
import maskFunction from "../../util/mask-function.js"
import realGetProxyDetails from "../../real/get-proxy-details.js"
import realProcess from "../../real/process.js"
import realRequire from "../../real/require.js"
import shared from "../../shared.js"
import validateString from "../../util/validate-string.js"

const realResolve = realRequire.resolve
const realPaths = realResolve && realResolve.paths
const { symbol } = shared

const ownExportsMap = new Map([
  [symbol.entry, Entry],
  [symbol.realGetProxyDetails, realGetProxyDetails],
  [symbol.realRequire, realRequire],
  [symbol.runtime, Runtime],
  [symbol.shared, shared]
])

function makeRequireFunction(mod, requirer, resolver) {
  const isOwn = isOwnModule(mod)

  let req = function require(request) {
    const exported = isOwn
      ? ownRequire(request)
      : void 0

    return exported === void 0
      ? requirer.call(mod, request)
      : exported
  }

  function resolve(request, options) {
    validateString(request, "request")
    return resolver.call(mod, request, options)
  }

  function paths(request) {
    validateString(request, "request")

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
    resolve.paths = maskFunction(paths, realPaths)
    req.resolve = maskFunction(resolve, realResolve)
    req = maskFunction(req, realRequire)
  }

  return req
}

function ownRequire(request) {
  if (typeof request === "symbol") {
    return ownExportsMap.get(request)
  }
}

export default makeRequireFunction
