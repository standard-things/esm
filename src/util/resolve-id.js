import { _nodeModulePaths, _resolveFilename } from "module"
import FastObject from "../fast-object.js"
import NodeError from "../node-error.js"

import builtinModules from "../builtin-modules.js"
import decodeURIComponent from "./decode-uri-component.js"
import { dirname } from "path"
import encodedSlash from "./encoded-slash.js"
import isPath from "./is-path.js"
import { parse } from "url"
import urlToPath from "./url-to-path.js"

const resolveCache = new FastObject

const isWin = process.platform === "win32"
const pathMode = isWin ? "win32" : "posix"

const queryHashRegExp = /[?#].+$/
const urlCharsRegExp = isWin ? /[?#%]/ : /[:?#%]/

function resolveId(id, parent, options) {
  if (! id ||
      typeof id !== "string" ||
      id in builtinModules ||
      (! urlCharsRegExp.test(id) && isPath(id))) {
    return id
  }

  const filename = parent.filename === null ? "." : parent.filename
  const cacheKey = filename + "\0" + id

  if (cacheKey in resolveCache) {
    return resolveCache[cacheKey]
  }

  const fromPath = dirname(filename)

  if (! encodedSlash(id, pathMode)) {
    if (id.includes(":")) {
      const parsed = parse(id)

      if (parsed.protocol !== "file:") {
        throw new NodeError("ERR_INVALID_PROTOCOL", parsed.protocol, "file:")
      }

      let foundPath = urlToPath(parsed, pathMode)

      if (foundPath) {
        foundPath = resolvePath(foundPath, parent)
      }

      if (foundPath) {
        return resolveCache[cacheKey] = foundPath
      }
    } else {
      let foundPath
      const decodedId = decodeURIComponent(id.replace(queryHashRegExp, ""))

      if (options && options.cjs)  {
        foundPath = resolvePath(decodedId, parent)
      } else {
        // Prevent resolving non-local dependencies:
        // https://github.com/bmeck/node-eps/blob/rewrite-esm/002-es-modules.md#432-removal-of-non-local-dependencies
        const paths = _nodeModulePaths(fromPath)

        // Hack: Overwrite `path.concat()` to prevent global paths from being
        // concatenated.
        paths.concat = () => paths

        // Ensure a parent id and filename are provided to avoid going down the
        // --eval branch of `Module._resolveLookupPaths()`.
        foundPath = resolvePath(decodedId, { filename, id: "<mock>", paths })
      }

      if (foundPath) {
        return resolveCache[cacheKey] = foundPath
      }
    }
  }

  const foundPath = resolvePath(id, parent)

  if (foundPath) {
    throw new NodeError("ERR_MODULE_RESOLUTION_DEPRECATED", id, fromPath, foundPath)
  } else {
    throw new NodeError("ERR_MISSING_MODULE", id)
  }
}

function resolvePath(request, parent) {
  try {
    return _resolveFilename(request, parent)
  } catch (e) {}
  return ""
}

export default resolveId
