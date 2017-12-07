import FastObject from "../../fast-object.js"
import PkgInfo from "../../pkg-info.js"

import _resolveFilename from "../_resolve-filename.js"
import decodeURIComponent from "../../util/decode-uri-component.js"
import { dirname } from "path"
import encodedSlash from "../../util/encoded-slash.js"
import errors from "../../errors.js"
import extname from "../../path/extname.js"
import isAbsolutePath from "../../util/is-absolute-path.js"
import isRelativePath from "../../util/is-relative-path.js"
import moduleDirname from "../../module/dirname.js"
import parseURL from "../../util/parse-url.js"
import urlToPath from "../../util/url-to-path.js"

const codeOfSlash = "/".charCodeAt(0)

const localhostRegExp = /^\/\/localhost\b/
const queryHashRegExp = /[?#].*$/

const esmExts = [".mjs", ".js", ".json", ".node"]
const gzExts = esmExts.concat(".gz", ".mjs.gz", ".js.gz")
const noExts = []

const esmExtsLookup = new FastObject
const gzExtsLookup = new FastObject

for (const ext of esmExts) {
  esmExtsLookup[ext] = true
}

for (const ext of gzExts) {
  gzExtsLookup[ext] = true
}

function resolveFilename(id, parent, isMain) {
  if (typeof id !== "string") {
    throw new errors.TypeError("ERR_INVALID_ARG_TYPE", "id", "string")
  }

  let foundPath
  let extLookup = esmExtsLookup
  let searchExts = esmExts
  let skipWarnings = false

  const isAbs = isAbsolutePath(id)
  const fromPath = isAbs ? dirname(id) : moduleDirname(parent)
  const pkgInfo = PkgInfo.get(fromPath)

  if (! encodedSlash(id)) {
    if (! isAbs &&
        ! isRelativePath(id) &&
        (id.charCodeAt(0) === codeOfSlash || id.includes(":"))) {
      const parsed = parseURL(id)
      foundPath = urlToPath(parsed)

      if (! foundPath &&
          parsed.protocol !== "file:" &&
          ! localhostRegExp.test(id)) {
        throw new errors.Error("ERR_INVALID_PROTOCOL", parsed.protocol, "file:")
      }

      if (foundPath) {
        foundPath = _resolveFilename(foundPath, parent, isMain, true, true, noExts)
      }
    } else {
      // Prevent resolving non-local dependencies:
      // https://github.com/bmeck/node-eps/blob/rewrite-esm/002-es-modules.md#432-removal-of-non-local-dependencies
      let skipGlobalPaths = true

      if (pkgInfo) {
        const { options } = pkgInfo

        if (options.gz) {
          extLookup = gzExtsLookup
          searchExts = gzExts
        }

        if (options.cjs.paths) {
          skipGlobalPaths = false
        }
      }

      const decodedId = decodeURIComponent(id.replace(queryHashRegExp, ""))
      foundPath = _resolveFilename(decodedId, parent, isMain, skipWarnings, skipGlobalPaths, searchExts)
    }
  }

  if (foundPath) {
    if (pkgInfo && pkgInfo.options.cjs.paths) {
      return foundPath
    }

    if (extname(foundPath) in extLookup) {
      return foundPath
    }

    throw new errors.Error("ERR_UNKNOWN_FILE_EXTENSION", foundPath)
  }

  skipWarnings = true
  foundPath = _resolveFilename(id, parent, isMain, skipWarnings)

  if (foundPath) {
    throw new errors.Error("ERR_MODULE_RESOLUTION_LEGACY", id, fromPath, foundPath)
  }

  throw new errors.Error("ERR_MISSING_MODULE", id)
}

export default resolveFilename
