// Based on Node's `Module._resolveLookupPaths`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import GenericArray from "../generic/array.js"
import Module from "../module.js"

import { dirname } from "../safe/path.js"
import isRelativePath from "../util/is-relative-path.js"
import moduleState from "./state.js"
import nodeModulePaths from "./node-module-paths.js"

function resolveLookupPaths(request, parent, skipGlobalPaths) {
  const parentFilename = parent && parent.filename

  // Look outside if not a relative path.
  if (! isRelativePath(request)) {
    const parentPaths = parent && parent.paths
    const paths = parentPaths
      ? GenericArray.from(parentPaths)
      : GenericArray.of()

    if (parentPaths &&
        ! skipGlobalPaths) {
      GenericArray.push(paths, ...moduleState.globalPaths)
    }

    return paths.length ? paths : null
  }

  // With --eval, `parent.id` isn't set and `parent.filename` is `null`.
  if (! parent ||
      ! parent.id ||
      ! parentFilename) {
    // Normally, the path is taken from `realpath(__filename)`,
    // but with --eval there is no `__filename`.
    const paths = skipGlobalPaths
      ? nodeModulePaths(".")
      : Module._nodeModulePaths(".")

    GenericArray.unshift(paths, ".")
    return paths
  }

  return GenericArray.of(dirname(parentFilename))
}

export default resolveLookupPaths
