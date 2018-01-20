// Based on Node's `Module._resolveLookupPaths` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Module from "../module.js"

import { dirname } from "path"
import moduleState from "./state.js"
import nodeModulePaths from "./node-module-paths.js"

const codeOfDot = ".".charCodeAt(0)
const codeOfSlash = "/".charCodeAt(0)

const { slice } = Array.prototype

function resolveLookupPaths(request, parent, skipGlobalPaths) {
  const code0 = request.charCodeAt(0)
  const code1 = request.charCodeAt(1)
  const parentFilePath = parent && parent.filename

  // Look outside if not a relative path.
  if (request !== "." &&
      ! (code0 === codeOfDot &&
         (code1 === codeOfDot ||
          code1 === codeOfSlash))) {
    const parentPaths = parent && parent.paths
    const paths = parentPaths ? slice.call(parentPaths) : []

    if (parentPaths &&
        ! skipGlobalPaths) {
      paths.push(...moduleState.globalPaths)
    }

    return paths.length ? paths : null
  }

  // With --eval, `parent.id` is not set and `parent.filename` is `null`.
  if (! parent ||
      ! parent.id ||
      ! parentFilePath) {
    // Normally, the path is taken from `realpath(__filename)`,
    // but with --eval there is no `__filename`.
    const paths = skipGlobalPaths
      ? nodeModulePaths(".")
      : Module._nodeModulePaths(".")

    paths.unshift(".")
    return paths
  }

  return [dirname(parent.filename)]
}

export default resolveLookupPaths
