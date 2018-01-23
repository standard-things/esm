// Based on Node's `Module._resolveLookupPaths` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import Module from "../module.js"

import { dirname } from "path"
import isRelativePath from "../util/is-relative-path.js"
import moduleState from "./state.js"
import nodeModulePaths from "./node-module-paths.js"

const { slice } = Array.prototype

function resolveLookupPaths(request, parent, skipGlobalPaths) {
  const parentFilePath = parent && parent.filename

  // Look outside if not a relative path.
  if (! isRelativePath(request)) {
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
