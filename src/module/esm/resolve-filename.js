import { dirname, extname } from "../../safe/path.js"

import CHAR_CODE from "../../constant/char-code.js"
import ENTRY from "../../constant/entry.js"
import ENV from "../../constant/env.js"
import PACKAGE from "../../constant/package.js"

import Entry from "../../entry.js"
import Loader from "../../loader.js"
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
import maskStackTrace from "../../error/mask-stack-trace.js"
import parseURL from "../../util/parse-url.js"
import pnp from "../../pnp.js"
import resolveLookupPaths from "../internal/resolve-lookup-paths.js"
import shared from "../../shared.js"
import staticNodeModulePaths from "../static/node-module-paths.js"

const {
  FORWARD_SLASH
} = CHAR_CODE

const {
  TYPE_ESM
} = ENTRY

const {
  ELECTRON,
  YARN_PNP
} = ENV

const {
  MODE_AUTO
} = PACKAGE

const {
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
const strictExtsLookup = new Set(strictExts)

function resolveFilename(request, parent, isMain = false, options) {
  // Electron and Muon patch `Module._resolveFilename()`.
  // https://github.com/electron/electron/blob/master/lib/common/reset-search-paths.js
  // https://github.com/brave/muon/blob/master/lib/common/reset-search-paths.js
  if (ELECTRON &&
      bundledLookup.has(request)) {
    return SafeModule._resolveFilename(request, parent, isMain, options)
  }

  if (builtinLookup.has(request)) {
    return request
  }

  if (YARN_PNP) {
    return pnp._resolveFilename(request, parent, isMain, options)
  }

  const isAbs = isAbsolute(request)
  const parentEntry = Entry.get(parent)

  if (parentEntry !== null) {
    parentEntry.updateFilename()
  }

  let fromPath

  if (isAbs) {
    fromPath = dirname(request)
  } else {
    fromPath = parentEntry === null ? "" : parentEntry.dirname
  }

  let cache
  let cacheKey

  if (! isObject(options)) {
    cache = shared.memoize.moduleESMResolveFilename

    cacheKey =
      request + "\0" +
      fromPath + "\0" +
      (isMain ? "1" : "")

    const cached = cache.get(cacheKey)

    if (cached !== void 0) {
      return cached
    }
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
    autoMode = false
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

    if (foundPath === "" &&
        parsed.protocol !== "file:" &&
        ! localhostRegExp.test(request)) {
      const error = new ERR_INVALID_PROTOCOL(parsed.protocol, "file:")

      maybeMaskStackTrace(error, parentEntry)

      throw error
    }

    if (foundPath !== "") {
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

    if (foundPath === "" &&
        builtinLookup.has(decoded)) {
      if (cache !== void 0) {
        cache.set(cacheKey, decoded)
      }

      return decoded
    }
  }

  if (foundPath !== "") {
    if (autoMode ||
        cjsPaths ||
        isMain ||
        isJS(foundPath) ||
        isMJS(foundPath) ||
        strictExtsLookup.has(extname(foundPath))) {
      if (cache !== void 0) {
        cache.set(cacheKey, foundPath)
      }

      return foundPath
    }

    const error = new ERR_UNKNOWN_FILE_EXTENSION(foundPath)

    maybeMaskStackTrace(error, parentEntry)

    throw error
  }

  foundPath = tryLegacyResolveFilename(request, parent, isMain, options)

  if (foundPath !== "") {
    if (cjsPaths) {
      if (cache !== void 0) {
        cache.set(cacheKey, foundPath)
      }

      return foundPath
    }

    const error = new ERR_MODULE_RESOLUTION_LEGACY(request, fromPath, foundPath)

    maybeMaskStackTrace(error, parentEntry)

    throw error
  }

  const error = new MODULE_NOT_FOUND(request, parent)

  maybeMaskStackTrace(error, parentEntry)

  throw error
}

function _resolveFilename(request, parent, isMain, options, fields, exts, skipGlobalPaths) {
  let paths

  if (options &&
      Array.isArray(options.paths)) {
    paths = resolveLookupPathsFrom(request, options.paths, skipGlobalPaths)
  } else {
    paths = resolveLookupPaths(request, parent, skipGlobalPaths)

    if (paths === null) {
      paths = []
    }
  }

  return findPath(request, paths, isMain, fields, exts)
}

function maybeMaskStackTrace(error, parentEntry) {
  if (! Loader.state.package.default.options.debug) {
    maskStackTrace(error, {
      filename: parentEntry === null ? void 0 : parentEntry.filename,
      inModule: parentEntry === null ? void 0 : parentEntry.type === TYPE_ESM
    })
  }

  return error
}

function resolveLookupPathsFrom(request, fromPaths, skipGlobalPaths) {
  const fakeParent = new Module("")
  const paths = []

  for (const fromPath of fromPaths) {
    fakeParent.paths = staticNodeModulePaths(fromPath)

    const lookupPaths = resolveLookupPaths(request, fakeParent, skipGlobalPaths)

    for (const lookupPath of lookupPaths) {
      if (paths.indexOf(lookupPath) === -1) {
        paths.push(lookupPath)
      }
    }
  }

  return paths
}

function tryLegacyResolveFilename(request, parent, isMain, options) {
  try {
    return Module._resolveFilename(request, parent, isMain, options)
  } catch {}

  return ""
}

export default resolveFilename
