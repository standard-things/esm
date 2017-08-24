// Based on Node's `Module._resolveLookupPaths` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import { dirname, resolve } from "path"
import builtinModules from "../builtin-modules.js"
import moduleState from "./state.js"
import nodeModulePaths from "./node-module-paths.js"

const { slice } = Array.prototype

const codeOfDot = ".".charCodeAt(0)
const codeOfSlash = "/".charCodeAt(0)

function resolveLookupPaths(request, parent, skipGlobalPaths) {
  if (request in builtinModules) {
    return null
  }

  // Check for relative path.
  if (request.length < 2 ||
      request.charCodeAt(0) !== codeOfDot ||
      (request.charCodeAt(1) !== codeOfDot &&
       request.charCodeAt(1) !== codeOfSlash)) {
    const parentPaths = parent && parent.paths
    const parentFilename = parent && parent.filename
    const paths = parentPaths ? slice.call(parentPaths) : []

    // Maintain backwards compat with certain broken uses of require(".")
    // by putting the module"s directory in front of the lookup paths.
    if (request === ".") {
      paths.unshift(parentFilename ? dirname(parentFilename) : resolve(request))
    }

    if (parentPaths && ! skipGlobalPaths) {
      paths.push(...moduleState.globalPaths)
    }

    return paths.length ? paths : null
  }

  // With --eval, parent.id is not set and parent.filename is null.
  if (! parent ||
      ! parent.id ||
      ! parent.filename) {
    // Normally the path is taken from `ealpath(__filename)` but with --eval
    // there is no filename.
    const paths = nodeModulePaths(".")
    paths.unshift(".")
    return paths
  }

  return [dirname(parent.filename)]
}

export default resolveLookupPaths
