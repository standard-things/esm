import FastObject from "../fast-object.js"

import { _nodeModulePaths } from "module"
import builtinModules from "../builtin-modules.js"
import decodeURIComponent from "./decode-uri-component.js"
import { dirname } from "path"
import encodedSlash from "./encoded-slash.js"
import errors from "../errors.js"
import isPath from "./is-path.js"
import parseURL from "./parse-url.js"
import resolveFilePath from "./resolve-file-path.js"
import urlToPath from "./url-to-path.js"

const codeOfSlash = "/".charCodeAt(0)
const isWin = process.platform === "win32"
const pathMode = isWin ? "win32" : "posix"

const localhostRegExp = /^\/\/localhost\b/
const queryHashRegExp = /[?#].*$/
const urlCharsRegExp = isWin ? /[?#%]/ : /[:?#%]/

const resolveCache = new FastObject

function resolveId(id, parent, options) {
  if (typeof id !== "string") {
    throw new errors.TypeError("ERR_INVALID_ARG_TYPE", "id", "string")
  }

  if (id in builtinModules) {
    return id
  }

  const { isMain } = options
  const idIsPath = isPath(id)

  if (idIsPath && ! urlCharsRegExp.test(id)) {
    const foundPath = resolveFilePath(id, parent, isMain)

    if (foundPath) {
      return foundPath
    }

    throw new errors.Error("ERR_MISSING_MODULE", id)
  }

  const filename = parent.filename === null ? "." : parent.filename
  const cacheKey = filename + "\0" + id

  if (cacheKey in resolveCache) {
    return resolveCache[cacheKey]
  }

  const fromPath = dirname(filename)

  if (! encodedSlash(id, pathMode)) {
    if (! idIsPath &&
        (id.charCodeAt(0) === codeOfSlash || id.includes(":"))) {
      const parsed = parseURL(id)
      let foundPath = urlToPath(parsed, pathMode)

      if (! foundPath &&
          parsed.protocol !== "file:" &&
          ! localhostRegExp.test(id)) {
        throw new errors.Error("ERR_INVALID_PROTOCOL", parsed.protocol, "file:")
      }

      if (foundPath) {
        foundPath = resolveFilePath(foundPath, parent, isMain)
      }

      if (foundPath) {
        return resolveCache[cacheKey] = foundPath
      }
    } else {
      let fromParent = parent

      if (! options.cjs)  {
        // Prevent resolving non-local dependencies:
        // https://github.com/bmeck/node-eps/blob/rewrite-esm/002-es-modules.md#432-removal-of-non-local-dependencies
        const paths = _nodeModulePaths(fromPath)

        // Hack: Overwrite `path.concat()` to prevent global paths from being
        // concatenated.
        paths.concat = () => paths

        // Ensure a parent id and filename are provided to avoid going down the
        // --eval branch of `Module._resolveLookupPaths()`.
        fromParent = { filename, id: "<mock>", paths }
      }

      const decodedId = decodeURIComponent(id.replace(queryHashRegExp, ""))
      const foundPath = resolveFilePath(decodedId, fromParent, isMain)

      if (foundPath) {
        return resolveCache[cacheKey] = foundPath
      }
    }
  }

  const foundPath = resolveFilePath(id, parent, isMain)

  if (foundPath) {
    throw new errors.Error("ERR_MODULE_RESOLUTION_DEPRECATED", id, fromPath, foundPath)
  } else {
    throw new errors.Error("ERR_MISSING_MODULE", id)
  }
}

export default resolveId
