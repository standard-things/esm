import { dirname, extname } from "../../safe/path.js"

import CHAR_CODE from "../../constant/char-code.js"
import ENTRY from "../../constant/entry.js"
import ENV from "../../constant/env.js"

import Entry from "../../entry.js"
import Loader from "../../loader.js"
import Module from "../../module.js"
import Package from "../../package.js"
import SafeModule from "../../safe/module.js"

import builtinLookup from "../../builtin-lookup.js"
import bundledLookup from "../../bundled-lookup.js"
import decodeURIComponent from "../../util/decode-uri-component.js"
import emptyArray from "../../util/empty-array.js"
import errors from "../../errors.js"
import findPath from "../internal/find-path.js"
import getFilePathFromURL from "../../util/get-file-path-from-url.js"
import hasEncodedSep from "../../path/has-encoded-sep.js"
import isAbsolute from "../../path/is-absolute.js"
import isExtJS from "../../path/is-ext-js.js"
import isExtMJS from "../../path/is-ext-mjs.js"
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
  TYPE_CJS,
  TYPE_PSEUDO
} = ENTRY

const {
  ELECTRON,
  FLAGS,
  YARN_PNP
} = ENV

const {
  ERR_INVALID_PROTOCOL,
  ERR_MODULE_RESOLUTION_LEGACY,
  ERR_UNKNOWN_FILE_EXTENSION,
  MODULE_NOT_FOUND
} = errors

const localhostRegExp = /^\/\/localhost\b/
const queryHashRegExp = /[?#].*$/

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

  let cjsPaths = pkgOptions.cjs.paths
  let fields = pkgOptions.mainFields

  if (parentEntry !== null &&
      parentEntry.extname === ".mjs") {
    cjsPaths = false
    fields = strictFields
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
      const paths = isAbs
        ? [""]
        : [fromPath]

      let exts

      if (! cjsPaths) {
        exts = FLAGS.esModuleSpecifierResolution === "explicit"
          ? emptyArray
          : strictExts
      }

      pathname = decodeURIComponent(pathname)
      foundPath = findPath(pathname, paths, isMain, fields, exts)
    }
  } else if (! hasEncodedSep(request)) {
    const decoded = decodeURIComponent(request)

    // Prevent resolving non-local dependencies:
    // https://github.com/nodejs/node-eps/blob/master/002-es-modules.md#432-removal-of-non-local-dependencies
    const skipGlobalPaths = ! cjsPaths

    const exts = cjsPaths
      ? void 0
      : strictExts

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
    if (cjsPaths ||
        isMain ||
        isExtJS(foundPath) ||
        isExtMJS(foundPath) ||
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
    const maskOptions = {
      filename: null,
      inModule: false
    }

    if (parentEntry !== null) {
      const parentType = parentEntry.type

      maskOptions.filename = parentEntry.filename

      maskOptions.inModule =
        (! parentEntry.package.options.cjs.paths ||
         parentEntry.extname === ".mjs") &&
        parentType !== TYPE_CJS &&
        parentType !== TYPE_PSEUDO
    }

    maskStackTrace(error, maskOptions)
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
