// Based on Node's `Module._findPath`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import CHAR_CODE from "../constant/char-code.js"
import ENV from "../constant/env.js"

import Module from "../module.js"
import { Stats } from "../safe/fs.js"

import binding from "../binding.js"
import call from "../util/call.js"
import extname from "../path/extname.js"
import isAbsolute from "../path/is-absolute.js"
import isMJS from "../util/is-mjs.js"
import keys from "../util/keys.js"
import readFileFast from "../fs/read-file-fast.js"
import realpath from "../fs/realpath.js"
import { resolve } from "../safe/path.js"
import safeToString from "../util/safe-to-string.js"
import shared from "../shared.js"
import statFast from "../fs/stat-fast.js"
import statSync from "../fs/stat-sync.js"

const {
  BACKWARD_SLASH,
  DOT,
  FORWARD_SLASH
} = CHAR_CODE

const {
  WIN32
} = ENV

const { isFile, isSymbolicLink } = Stats.prototype
const { preserveSymlinks, preserveSymlinksMain } = binding.config

const mainFieldRegExp = /"main"/
const mainFields = ["main"]

const resolveSymlinks = ! preserveSymlinks
const resolveSymlinksMain = ! preserveSymlinksMain

function findPath(request, paths, isMain, fields, exts) {
  if (isAbsolute(request)) {
    paths = [""]
  } else if (! paths || ! paths.length) {
    return ""
  }

  const cache = shared.memoize.moduleFindPath

  const cacheKey =
    request + "\0" +
    safeToString(paths) +
    (fields ? "\0" + safeToString(fields) : "") +
    (exts ? "\0" + safeToString(exts) : "")

  if (Reflect.has(cache, cacheKey)) {
    return cache[cacheKey]
  }

  let trailingSlash = request.length > 0

  if (trailingSlash) {
    let code = request.charCodeAt(request.length - 1)

    if (code === DOT) {
      code = request.charCodeAt(request.length - 2)

      if (code === DOT) {
        code = request.charCodeAt(request.length - 3)
      }
    }

    trailingSlash =
      code === FORWARD_SLASH ||
      (WIN32 &&
       code === BACKWARD_SLASH)
  }

  const useRealpath = isMain ? resolveSymlinksMain : resolveSymlinks

  for (const curPath of paths) {
    if (curPath &&
        statFast(curPath) !== 1) {
      continue
    }

    const thePath = resolve(curPath, request)
    const ext = extname(thePath)

    let rc = -1
    let stat = null

    if (ext === ".js" ||
        ext === ".mjs") {
      stat = statSync(thePath)

      if (stat) {
        rc = call(isFile, stat) ? 0 : 1
      }
    } else {
      rc = statFast(thePath)
    }

    let filename

    if (! trailingSlash) {
      // If a file.
      if (rc === 0) {
        if (useRealpath &&
            (! stat ||
             call(isSymbolicLink, stat))) {
          filename = realpath(thePath)
        } else {
          filename = thePath
        }
      }

      if (! filename) {
        if (exts === void 0) {
          exts = keys(Module._extensions)
        }

        filename = tryExtensions(thePath, exts, isMain)
      }
    }

    // If a directory.
    if (rc === 1 &&
        ! filename) {
      if (exts === void 0) {
        exts = keys(Module._extensions)
      }

      if (fields === void 0) {
        fields = mainFields
      }

      filename =
        tryPackage(thePath, fields, exts, isMain) ||
        tryExtensions(resolve(thePath, "index"), exts, isMain)
    }

    if (filename) {
      return cache[cacheKey] = filename
    }
  }

  return ""
}

function readPackage(dirPath) {
  const cache = shared.memoize.moduleReadPackage

  if (Reflect.has(cache, dirPath)) {
    return cache[dirPath]
  }

  const jsonPath = resolve(dirPath, "package.json")
  const jsonString = readFileFast(jsonPath, "utf8")

  if (! jsonString ||
      ! mainFieldRegExp.test(jsonString)) {
    return null
  }

  try {
    return cache[dirPath] = JSON.parse(jsonString)
  } catch (e) {
    e.path = jsonPath
    e.message = "Error parsing " + jsonPath + ": " + safeToString(e.message)
    throw e
  }
}

function tryExtensions(thePath, exts, isMain) {
  for (const ext of exts) {
    const filename = tryFilename(thePath + ext, isMain)

    if (filename) {
      return filename
    }
  }

  return ""
}

function tryField(dirPath, fieldPath, exts, isMain) {
  if (typeof fieldPath !== "string") {
    return ""
  }

  const thePath = resolve(dirPath, fieldPath)

  return tryFilename(thePath, isMain) ||
    tryExtensions(thePath, exts, isMain) ||
    tryExtensions(resolve(thePath, "index"), exts, isMain)
}

function tryFilename(filename, isMain) {
  if (statFast(filename)) {
    return ""
  }

  if (isMain
      ? preserveSymlinksMain
      : preserveSymlinks) {
    return resolve(filename)
  }

  return realpath(filename)
}

function tryPackage(dirPath, fields, exts, isMain) {
  const json = readPackage(dirPath)

  if (! json) {
    return ""
  }

  for (const field of fields) {
    const filename = tryField(dirPath, json[field], exts, isMain)

    if (field === "main" ||
        ! isMJS(filename)) {
      return filename
    }
  }
}

export default findPath
