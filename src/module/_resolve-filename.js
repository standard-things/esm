// Based on Node's `Module._resolveFilename` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import _findPath from "./_find-path.js"
import _resolveLookupPaths from "./_resolve-lookup-paths.js"
import errors from "../errors.js"

function _resolveFilename(id, parent, isMain, skipWarnings, skipGlobalPaths, searchExts) {
  if (typeof id !== "string") {
    throw new errors.TypeError("ERR_INVALID_ARG_TYPE", "id", "string")
  }

  const paths = _resolveLookupPaths(id, parent, skipGlobalPaths)
  return _findPath(id, paths, isMain, skipWarnings, skipGlobalPaths, searchExts)
}

export default _resolveFilename
