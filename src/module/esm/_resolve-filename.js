import _findPath from "../_find-path.js"
import _resolveLookupPaths from "../_resolve-lookup-paths.js"
import errors from "../../errors.js"

function resolveFilename(request, parent, isMain, skipWarnings, skipGlobalPaths, searchExts) {
  if (typeof request !== "string") {
    throw new errors.TypeError("ERR_INVALID_ARG_TYPE", "request", "string")
  }

  const paths = _resolveLookupPaths(request, parent, skipGlobalPaths)
  return _findPath(request, paths, isMain, skipWarnings, skipGlobalPaths, searchExts)
}

export default resolveFilename
