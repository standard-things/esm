// Based on Node's `Module._resolveFilename` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import builtinModules from "../builtin-modules.js"
import findPath from "./find-path.js"
import resolveLookupPaths from "./resolve-lookup-paths.js"

function resolveFilename(id, parent, isMain, skipGlobalPaths) {
  if (id in builtinModules) {
    return id
  }

  const paths = resolveLookupPaths(id, parent, skipGlobalPaths)
  const filePath = findPath(id, parent, paths, isMain)

  if (! filePath) {
    const error = new Error("Cannot find module '" + id + "'")
    error.code = "MODULE_NOT_FOUND"
    throw error
  }

  return filePath
}

export default resolveFilename
