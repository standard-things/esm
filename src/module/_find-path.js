// Based on Node's `Module._findPath`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import { isAbsolute, resolve } from "../safe/path.js"

import CHAR_CODE from "../constant/char-code.js"
import ENV from "../constant/env.js"

import Module from "../module.js"

import binding from "../binding.js"
import isMJS from "../util/is-mjs.js"
import keys from "../util/keys.js"
import readFileFast from "../fs/read-file-fast.js"
import realpath from "../fs/realpath.js"
import safeToString from "../util/safe-to-string.js"
import shared from "../shared.js"
import stat from "../fs/stat.js"

const {
  BACKWARD_SLASH,
  DOT,
  FORWARD_SLASH
} = CHAR_CODE

const {
  CLI,
  INTERNAL,
  WIN32
} = ENV

const { preserveSymlinks, preserveSymlinksMain } = binding.config
const mainFieldRegExp = /"main"/

function findPath(request, paths, isMain, searchExts) {
  if (isAbsolute(request)) {
    paths = [""]
  } else if (! paths || ! paths.length) {
    return ""
  }

  const cache = shared.memoize.moduleFindPath

  const cacheKey =
    request + "\0" +
    safeToString(paths) +
    (searchExts ? "\0" + safeToString(searchExts) : "")

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

  for (const curPath of paths) {
    if (curPath &&
        stat(curPath) !== 1) {
      continue
    }

    let filename

    const basePath = resolve(curPath, request)
    const rc = stat(basePath)
    const isFile = rc === 0
    const isDir = rc === 1

    if (! trailingSlash) {
      if (isFile) {
        if (isMain
            ? preserveSymlinksMain
            : preserveSymlinks) {
          filename = resolve(basePath)
        } else {
          filename = realpath(basePath)
        }
      }

      if (! filename) {
        if (searchExts === void 0) {
          searchExts = keys(Module._extensions)
        }

        filename = tryExtensions(basePath, searchExts, isMain)
      }
    }

    if (isDir && ! filename) {
      if (searchExts === void 0) {
        searchExts = keys(Module._extensions)
      }

      filename =
        tryPackage(basePath, searchExts, isMain) ||
        tryExtensions(resolve(basePath, "index"), searchExts, isMain)
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
  let filename = ""

  for (const ext of exts) {
    filename = tryFilename(thePath + ext, isMain)

    if (filename) {
      return filename
    }
  }

  return filename
}

function tryField(json, field, basePath, exts, isMain) {
  const fieldPath = json[field]

  if (typeof fieldPath !== "string") {
    return ""
  }

  const filename = resolve(basePath, fieldPath)

  return tryFilename(filename, isMain) ||
    tryExtensions(filename, exts, isMain) ||
    tryExtensions(resolve(filename, "index"), exts, isMain)
}

function tryFilename(filename, isMain) {
  if (stat(filename)) {
    return ""
  }

  if (preserveSymlinks &&
      ! isMain) {
    return resolve(filename)
  }

  return realpath(filename)
}

function tryPackage(dirPath, exts, isMain) {
  const json = readPackage(dirPath)

  if (! json) {
    return ""
  }

  if ((CLI ||
       INTERNAL) &&
      json.esm) {
    const filename = tryField(json, "module", dirPath, exts, isMain)

    if (! isMJS(filename)) {
      return filename
    }
  }

  return tryField(json, "main", dirPath, exts, isMain)
}

export default findPath
