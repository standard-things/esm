// Based on Node's `Module._resolveFilename` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import builtinModules from "../builtin-modules.js"
import findPath from "./find-path.js"
import resolveLookupPaths from "./resolve-lookup-paths.js"

function resolveFilename(request, parent, isMain, skipGlobalPaths) {
  if (request in builtinModules) {
    return request
  }

  const paths = resolveLookupPaths(request, parent, skipGlobalPaths)
  const filename = findPath(request, parent, paths, isMain)

  if (! filename) {
    const error = new Error("Cannot find module '" + request + "'")
    error.code = "MODULE_NOT_FOUND"
    throw error
  }

  return filename
}

export default resolveFilename
