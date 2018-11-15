import { dirname, extname } from "../../safe/path.js"

import CHAR_CODE from "../../constant/char-code.js"
import ENV from "../../constant/env.js"
import PACKAGE from "../../constant/package.js"

import Entry from "../../entry.js"
import Module from "../../module.js"
import Package from "../../package.js"
import SafeModule from "../../safe/module.js"

import builtinLookup from "../../builtin-lookup.js"
import bundledLookup from "../../bundled-lookup.js"
import decodeURIComponent from "../../util/decode-uri-component.js"
import errors from "../../errors.js"
import findPath from "../internal/find-path.js"
import getFilePathFromURL from "../../util/get-file-path-from-url.js"
import hasEncodedSep from "../../path/has-encoded-sep.js"
import isAbsolute from "../../path/is-absolute.js"
import isJS from "../../path/is-js.js"
import isMJS from "../../path/is-mjs.js"
import isObject from "../../util/is-object.js"
import isRelative from "../../path/is-relative.js"
import parseURL from "../../util/parse-url.js"
import resolveLookupPaths from "../internal/resolve-lookup-paths.js"
import shared from "../../shared.js"
import staticNodeModulePaths from "../static/node-module-paths.js"

const {
  FORWARD_SLASH
} = CHAR_CODE

const {
  ELECTRON
} = ENV

const {
  MODE_AUTO
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
const strictExts = [".mjs", ".js", ".json", ".node", ".wasm"]
const strictFields = ["main"]
const strictExtsLookup = { __proto__: null }

for (const ext of strictExts) {
  strictExtsLookup[ext] = true
}

function resolveFilename(request, parent, isMain, options) {
  if (typeof request !== "string") {
    throw new ERR_INVALID_ARG_TYPE("request", "string")
  }

  // Electron and Muon patch `Module._resolveFilename()`.
  // https://github.com/electron/electron/blob/master/lib/common/reset-search-paths.js
  // https://github.com/brave/muon/blob/master/lib/common/reset-search-paths.js
  if (ELECTRON &&
      Reflect.has(bundledLookup, request)) {
    return SafeModule._resolveFilename(request)
  }

  if (Reflect.has(builtinLookup, request)) {
    return request
  }

  const isAbs = isAbsolute(request)
  const parentEntry = Entry.get(parent)

  let fromPath

  if (parentEntry !== null) {
    parentEntry.updateFilename()
  }

  if (! isAbs &&
      parentEntry !== null) {
    fromPath = parentEntry.dirname
  } else {
    fromPath = ""
  }

  const cache = shared.memoize.moduleESMResolveFilename

  let cacheKey

  if (! isObject(options)) {
    cacheKey =
      request + "\0" +
      fromPath + "\0" +
      (isMain ? "1" : "")

    const cached = cache.get(cacheKey)

    if (cached !== void 0) {
      return cached
    }
  }

  if (isAbs) {
    fromPath = dirname(request)
  }

  const isRel = ! isAbs && isRelative(request)
  const isPath = isAbs || isRel
  const pkgOptions = Package.get(fromPath).options

  let autoMode = pkgOptions.mode === MODE_AUTO
  let cjsPaths = pkgOptions.cjs.paths
  let exts = strictExts
  let fields = pkgOptions.mainFields

  // Prevent resolving non-local dependencies:
  // https://github.com/nodejs/node-eps/blob/master/002-es-modules.md#432-removal-of-non-local-dependencies
  let skipGlobalPaths = true

  if (parentEntry !== null &&
      parentEntry.extname === ".mjs") {
    autoMode =
    cjsPaths = false
    fields = strictFields
  }

  if (cjsPaths) {
    exts = void 0
    skipGlobalPaths = false
  }

  let foundPath = ""

  if (! isPath &&
      (request.charCodeAt(0) === FORWARD_SLASH ||
       request.indexOf(":") !== -1)) {
    const parsed = parseURL(request)

    foundPath = getFilePathFromURL(parsed)

    if (foundPath.length === 0 &&
        parsed.protocol !== "file:" &&
        ! localhostRegExp.test(request)) {
      throw new ERR_INVALID_PROTOCOL(parsed.protocol, "file:")
    }

    if (foundPath.length > 0) {
      foundPath = _resolveFilename(foundPath, parent, isMain, options, emptyArray, emptyArray, true)
    }
  } else if (isPath) {
    let pathname = request.replace(queryHashRegExp, "")

    if (! hasEncodedSep(pathname)) {
      const paths = isAbs ? [""] : [fromPath]

      pathname = decodeURIComponent(pathname)
      foundPath = findPath(pathname, paths, isMain, fields, exts)
    }
  } else if (! hasEncodedSep(request)) {
    const decoded = decodeURIComponent(request)

    foundPath = _resolveFilename(decoded, parent, isMain, options, fields, exts, skipGlobalPaths)

    if (foundPath.length === 0 &&
        Reflect.has(builtinLookup, decoded)) {
      cache.set(cacheKey, decoded)
      return decoded
    }
  }

  if (foundPath.length > 0) {
    if (autoMode ||
        cjsPaths ||
        isMain ||
        isJS(foundPath) ||
        isMJS(foundPath) ||
        Reflect.has(strictExtsLookup, extname(foundPath))) {
      cache.set(cacheKey, foundPath)
      return foundPath
    }

    throw new ERR_UNKNOWN_FILE_EXTENSION(foundPath)
  }

  foundPath = Module._resolveFilename(request, parent, isMain, options)

  if (foundPath.length > 0) {
    if (cjsPaths) {
      cache.set(cacheKey, foundPath)
      return foundPath
    }

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
    paths = resolveLookupPaths(request, parent, skipGlobalPaths)
  }

  return findPath(request, paths, isMain, fields, exts)
}

function resolveLookupPathsFrom(request, fromPaths, skipGlobalPaths) {
  const fakeParent = new Module("")
  const paths = []

  for (const fromPath of fromPaths) {
    fakeParent.paths = staticNodeModulePaths(fromPath)

    const lookupPaths = resolveLookupPaths(request, fakeParent, skipGlobalPaths)

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
