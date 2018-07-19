import CHAR_CODE from "../../constant/char-code.js"
import ENV from "../../constant/env.js"
import PACKAGE from "../../constant/package.js"

import Module from "../../module.js"
import Package from "../../package.js"
import SafeModule from "../../safe/module.js"

import _findPath from "../_find-path.js"
import _resolveLookupPaths from "../_resolve-lookup-paths.js"
import builtinLookup from "../../builtin-lookup.js"
import decodeURIComponent from "../../util/decode-uri-component.js"
import errors from "../../errors.js"
import extname from "../../path/extname.js"
import getFilePathFromURL from "../../util/get-file-path-from-url.js"
import getModuleDirname from "../../util/get-module-dirname.js"
import getModuleName from "../../util/get-module-name.js"
import hasEncodedSep from "../../path/has-encoded-sep.js"
import isAbsolute from "../../path/is-absolute.js"
import isJS from "../../path/is-js.js"
import isMJS from "../../path/is-mjs.js"
import isObject from "../../util/is-object.js"
import isRelative from "../../path/is-relative.js"
import nodeModulePaths from "../node-module-paths.js"
import parseURL from "../../util/parse-url.js"
import shared from "../../shared.js"

const {
  FORWARD_SLASH
} = CHAR_CODE

const {
  ELECTRON
} = ENV

const {
  OPTIONS_MODE_AUTO
} = PACKAGE

const {
  ERR_INVALID_ARG_TYPE,
  ERR_INVALID_PROTOCOL,
  ERR_MODULE_RESOLUTION_LEGACY,
  ERR_UNKNOWN_FILE_EXTENSION,
  MODULE_NOT_FOUND
} = errors

const localhostRegExp = /^\/\/localhost\b/
const queryHashRegExp = /[?#].*$/

const emptyArray = []
const strictExts = [".mjs", ".js", ".json", ".node"]
const strictFields = ["main"]
const strictExtsLookup = { __proto__: null }

for (const ext of strictExts) {
  strictExtsLookup[ext] = true
}

function resolveFilename(request, parent, isMain, options) {
  if (typeof request !== "string") {
    throw new ERR_INVALID_ARG_TYPE("request", "string")
  }

  const cache = shared.memoize.moduleESMResolveFilename

  const cacheKey = isObject(options)
    ? null
    : request + "\0" + getModuleName(parent) + "\0" + isMain

  if (cacheKey &&
      Reflect.has(cache, cacheKey)) {
    return cache[cacheKey]
  }

  if (Reflect.has(builtinLookup, request)) {
    return cache[cacheKey] = request
  }

  // Electron patches `Module._resolveFilename` to return its path.
  // https://github.com/electron/electron/blob/master/lib/common/reset-search-paths.js
  if (ELECTRON &&
      request === "electron") {
    return cache[cacheKey] = SafeModule._resolveFilename(request)
  }

  const isAbs = isAbsolute(request)
  const fromPath = getModuleDirname(isAbs ? request : parent)
  const pkgOptions = Package.get(fromPath).options

  let autoMode = pkgOptions.mode === OPTIONS_MODE_AUTO
  let cjsPaths = pkgOptions.cjs.paths
  let fields = pkgOptions.mainFields

  if (parent &&
      isMJS(parent.filename)) {
    autoMode =
    cjsPaths = false
    fields = strictFields
  }

  let foundPath

  if (! hasEncodedSep(request)) {
    const isRel =
      ! isAbs &&
      isRelative(request)

    if (! isAbs &&
        ! isRel &&
        (request.charCodeAt(0) === FORWARD_SLASH ||
         request.indexOf(":") !== -1)) {
      const parsed = parseURL(request)

      foundPath = getFilePathFromURL(parsed)

      if (! foundPath &&
          parsed.protocol !== "file:" &&
          ! localhostRegExp.test(request)) {
        throw new ERR_INVALID_PROTOCOL(parsed.protocol, "file:")
      }

      if (foundPath) {
        foundPath = _resolveFilename(foundPath, parent, isMain, options, emptyArray, emptyArray, true)
      }
    } else {
      let pathname = request

      if (isAbs ||
          isRel) {
        const paths = isAbs ? [""] : [fromPath]

        pathname = pathname.replace(queryHashRegExp, "")
        pathname = decodeURIComponent(pathname)
        foundPath = _findPath(pathname, paths, isMain, fields, strictExts)
      } else {
        // Prevent resolving non-local dependencies:
        // https://github.com/nodejs/node-eps/blob/master/002-es-modules.md#432-removal-of-non-local-dependencies
        const skipGlobalPaths = ! cjsPaths

        pathname = decodeURIComponent(pathname)
        foundPath = _resolveFilename(pathname, parent, isMain, options, fields, strictExts, skipGlobalPaths)
      }

      if (! foundPath &&
          Reflect.has(builtinLookup, pathname)) {
        return cache[cacheKey] = pathname
      }
    }
  }

  if (foundPath) {
    if (autoMode ||
        cjsPaths ||
        isMain ||
        isJS(foundPath) ||
        isMJS(foundPath) ||
        Reflect.has(strictExtsLookup, extname(foundPath))) {
      return cache[cacheKey] = foundPath
    }

    throw new ERR_UNKNOWN_FILE_EXTENSION(foundPath)
  }

  foundPath = _resolveFilename(request, parent, isMain, options, fields)

  if (foundPath) {
    throw new ERR_MODULE_RESOLUTION_LEGACY(request, fromPath, foundPath)
  }

  throw new MODULE_NOT_FOUND(request)
}

function _resolveFilename(request, parent, isMain, options, fields, exts, skipGlobalPaths) {
  let paths

  if (options &&
      Array.isArray(options.paths)) {
    paths = resolveLookupPathsFrom(request, options.paths, skipGlobalPaths)
  } else {
    paths = _resolveLookupPaths(request, parent, skipGlobalPaths)
  }

  return _findPath(request, paths, isMain, fields, exts)
}

function resolveLookupPathsFrom(request, fromPaths, skipGlobalPaths) {
  const fakeParent = new Module("")
  const paths = []

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

  return paths
}

export default resolveFilename
