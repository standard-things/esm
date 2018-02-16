import GenericArray from "../../generic/array.js"
import Module from "../../module.js"

import _findPath from "../_find-path.js"
import _resolveLookupPaths from "../_resolve-lookup-paths.js"
import errors from "../../errors.js"
import nodeModulePaths from "../node-module-paths.js"

function resolveFilename(request, parent, isMain, options, skipWarnings, skipGlobalPaths, searchExts) {
  if (typeof request !== "string") {
    throw new errors.TypeError("ERR_INVALID_ARG_TYPE", "request", "string")
  }

  let paths

  if (options &&
      GenericArray.isArray(options.paths)) {
    const fakeParent = new Module("", null)
    const fromPaths = options.paths

    paths = []

    for (const fromPath of fromPaths) {
      fakeParent.paths = nodeModulePaths(fromPath)
      const lookupPaths = _resolveLookupPaths(request, fakeParent, skipGlobalPaths)

      if (GenericArray.indexOf(paths, fromPath) === -1) {
        GenericArray.push(paths, fromPath)
      }

      for (const lookupPath of lookupPaths) {
        if (GenericArray.indexOf(paths, lookupPath) === -1) {
          GenericArray.push(paths, lookupPath)
        }
      }
    }
  } else {
    paths = _resolveLookupPaths(request, parent, skipGlobalPaths)
  }

  return _findPath(request, paths, isMain, searchExts)
}

export default resolveFilename
