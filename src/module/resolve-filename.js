// Based on Node's `Module._resolveFilename` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import errors from "../errors.js"
import findPath from "./find-path.js"
import resolveLookupPaths from "./resolve-lookup-paths.js"

function resolveFilename(id, parent, isMain, skipWarnings, skipGlobalPaths, searchExts) {
  if (typeof id !== "string") {
    throw new errors.TypeError("ERR_INVALID_ARG_TYPE", "id", "string")
  }

  const paths = resolveLookupPaths(id, parent, skipGlobalPaths)
  return findPath(id, paths, isMain, skipWarnings, skipGlobalPaths, searchExts)
}

export default resolveFilename
