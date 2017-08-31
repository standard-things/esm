import _resolveFilename from "../resolve-filename.js"
import createOptions from "../../util/create-options.js"
import decodeURIComponent from "../../util/decode-uri-component.js"
import { dirname } from "path"
import encodedSlash from "../../util/encoded-slash.js"
import errors from "../../errors.js"
import isPath from "../../util/is-path.js"
import parseURL from "../../util/parse-url.js"
import urlToPath from "../../util/url-to-path.js"

const codeOfSlash = "/".charCodeAt(0)
const pathMode = process.platform === "win32" ? "win32" : "posix"
const searchExts = [".mjs", ".js", ".json", ".node"]

const localhostRegExp = /^\/\/localhost\b/
const queryHashRegExp = /[?#].*$/

function resolveFilename(id, parent, options) {
  if (typeof id !== "string") {
    throw new errors.TypeError("ERR_INVALID_ARG_TYPE", "id", "string")
  }

  options = createOptions(options)

  const filename = parent && typeof parent.filename === "string"
    ? parent.filename
    : "."

  const fromPath = dirname(filename)
  const { isMain } = options

  if (! encodedSlash(id, pathMode)) {
    if (! isPath(id) &&
        (id.charCodeAt(0) === codeOfSlash || id.includes(":"))) {
      const parsed = parseURL(id)
      let foundPath = urlToPath(parsed, pathMode)

      if (! foundPath &&
          parsed.protocol !== "file:" &&
          ! localhostRegExp.test(id)) {
        throw new errors.Error("ERR_INVALID_PROTOCOL", parsed.protocol, "file:")
      }

      if (foundPath) {
        foundPath = _resolveFilename(foundPath, parent, isMain)
      }

      if (foundPath) {
        return foundPath
      }
    } else {
      // Prevent resolving non-local dependencies:
      // https://github.com/bmeck/node-eps/blob/rewrite-esm/002-es-modules.md#432-removal-of-non-local-dependencies
      const skipGlobalPaths = ! options.cjs
      const skipOutsideDot = options.cjs ? void 0 : false
      const decodedId = decodeURIComponent(id.replace(queryHashRegExp, ""))
      const foundPath = _resolveFilename(decodedId, parent, isMain, skipGlobalPaths, skipOutsideDot, searchExts)

      if (foundPath) {
        return foundPath
      }
    }
  }

  const foundPath = _resolveFilename(id, parent, isMain)

  if (foundPath) {
    throw new errors.Error("ERR_MODULE_RESOLUTION_DEPRECATED", id, fromPath, foundPath)
  }

  throw new errors.Error("ERR_MISSING_MODULE", id)
}

export default resolveFilename
