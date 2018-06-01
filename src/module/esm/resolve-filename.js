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
import isAbsolutePath from "../../util/is-absolute-path.js"
import isMJS from "../../util/is-mjs.js"
import isObject from "../../util/is-object.js"
import isRelativePath from "../../util/is-relative-path.js"
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

const esmExts = [".mjs", ".js", ".json", ".node"]
const noExts = []

const esmExtsLookup = { __proto__: null }

for (const ext of esmExts) {
  esmExtsLookup[ext] = true
}

function resolveFilename(request, parent, isMain, options) {
  if (typeof request !== "string") {
    throw new ERR_INVALID_ARG_TYPE("request", "string")
  }

  if (Reflect.has(builtinLookup, request)) {
    return request
  }

  // Electron patches `Module._resolveFilename` to return its path.
  // https://github.com/electron/electron/blob/master/lib/common/reset-search-paths.js
  if (ELECTRON &&
      request === "electron") {
    return SafeModule._resolveFilename(request)
  }

  const cache = shared.memoize.moduleESMResolveFilename
  const cacheKey = isObject(options)
    ? null
    : request + "\0" + getModuleName(parent) + "\0" + isMain

  if (cacheKey &&
      Reflect.has(cache, cacheKey)) {
    return cache[cacheKey]
  }

  const isAbs = isAbsolutePath(request)
  const fromPath = getModuleDirname(isAbs ? request : parent)

  const pkg = Package.get(fromPath)
  const pkgOptions = pkg && pkg.options

  let autoMode =
    pkgOptions &&
    pkgOptions.mode === OPTIONS_MODE_AUTO

  let cjsPaths =
    pkgOptions &&
    pkgOptions.cjs.paths

  if (isMJS(parent)) {
    autoMode =
    cjsPaths = false
  }

  let foundPath
  let skipWarnings = false

  if (! hasEncodedSep(request)) {
    if (! isAbs &&
        ! isRelativePath(request) &&
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
        foundPath = _resolveFilename(foundPath, parent, isMain, options, true, true, noExts)
      }
    } else {
      // Prevent resolving non-local dependencies:
      // https://github.com/bmeck/node-eps/blob/rewrite-esm/002-es-modules.md#432-removal-of-non-local-dependencies
      const decoded = decodeURIComponent(request.replace(queryHashRegExp, ""))
      const skipGlobalPaths = ! cjsPaths

      foundPath = _resolveFilename(decoded, parent, isMain, options, skipWarnings, skipGlobalPaths, esmExts)
    }
  }

  if (foundPath) {
    if (autoMode ||
        cjsPaths ||
        isMain ||
        Reflect.has(esmExtsLookup, extname(foundPath))) {
      return cache[cacheKey] = foundPath
    }

    throw new ERR_UNKNOWN_FILE_EXTENSION(foundPath)
  }

  skipWarnings = true
  foundPath = _resolveFilename(request, parent, isMain, options, skipWarnings)

  if (foundPath) {
    throw new ERR_MODULE_RESOLUTION_LEGACY(request, fromPath, foundPath)
  }

  throw new MODULE_NOT_FOUND(request)
}

function _resolveFilename(request, parent, isMain, options, skipWarnings, skipGlobalPaths, searchExts) {
  let paths

  if (options &&
      Array.isArray(options.paths)) {
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

  return _findPath(request, paths, isMain, searchExts)
}

export default resolveFilename
