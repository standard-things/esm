import Module from "../../module.js"

import _findPath from "../_find-path.js"
import _resolveLookupPaths from "../_resolve-lookup-paths.js"
import errors from "../../errors.js"
import nodeModulePaths from "../node-module-paths.js"

const { isArray } = Array

function resolveFilename(request, parent, isMain, options, skipWarnings, skipGlobalPaths, searchExts) {
  if (typeof request !== "string") {
    throw new errors.TypeError("ERR_INVALID_ARG_TYPE", "request", "string")
  }

  let paths

  if (options &&
      isArray(options.paths)) {
    const fakeParent = new Module("", null)
    const fromPaths = options.paths

    paths = []

    for (const fromPath of fromPaths) {
      fakeParent.paths = nodeModulePaths(fromPath)
      const lookupPaths = _resolveLookupPaths(request, fakeParent, skipGlobalPaths)

      if (paths.indexOf(fromPath) === -1) {
        paths.push(fromPath)
      }

      for (const lookupPath of lookupPaths) {
        if (paths.indexOf(lookupPath) === -1) {
          paths.push(lookupPath)
        }
      }
    }
  } else {
    paths = _resolveLookupPaths(request, parent, skipGlobalPaths)
  }

  return _findPath(request, paths, isMain, skipWarnings, skipGlobalPaths, searchExts)
}

export default resolveFilename
