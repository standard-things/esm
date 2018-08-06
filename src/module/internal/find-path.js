// Based on Node's `Module._findPath`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import { basename, dirname, resolve, sep } from "../../safe/path.js"

import CHAR_CODE from "../../constant/char-code.js"
import ENV from "../../constant/env.js"

import GenericArray from "../../generic/array.js"
import Module from "../../module.js"
import { Stats } from "../../safe/fs.js"

import call from "../../util/call.js"
import isAbsolute from "../../path/is-absolute.js"
import isJS from "../../path/is-js.js"
import isMJS from "../../path/is-mjs.js"
import keys from "../../util/keys.js"
import readPackage from "./read-package.js"
import realpath from "../../fs/realpath.js"
import shared from "../../shared.js"
import statFast from "../../fs/stat-fast.js"
import statSync from "../../fs/stat-sync.js"

const {
  BACKWARD_SLASH,
  DOT,
  FORWARD_SLASH
} = CHAR_CODE

const {
  FLAGS,
  WIN32
} = ENV

const { isFile, isSymbolicLink } = Stats.prototype
const { preserveSymlinks, preserveSymlinksMain } = FLAGS

const mainFields = ["main"]

let resolveSymlinks = ! preserveSymlinks
let resolveSymlinksMain = ! preserveSymlinksMain

function findPath(request, paths, isMain, fields, exts) {
  let cacheKey = request

  if (paths) {
    cacheKey += "\0" + (paths.length === 1 ? paths[0] : GenericArray.join(paths))
  }

  if (fields) {
    cacheKey += "\0" + (fields.length === 1 ? fields[0] : GenericArray.join(fields))
  }

  if (exts) {
    cacheKey += "\0" + (exts.length === 1 ? exts[0] : GenericArray.join(exts))
  }

  const cache = shared.memoize.moduleInternalFindPath
  const cached = cache[cacheKey]

  if (cached !== void 0) {
    return cached
  }

  const isAbs = isAbsolute(request)

  if (isAbs) {
    paths = [""]
  } else if (! paths || ! paths.length) {
    return ""
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

  const useRealpath = isMain
    ? resolveSymlinksMain
    : resolveSymlinks

  for (let curPath of paths) {
    if (curPath &&
        statFast(curPath) !== 1) {
      continue
    }

    if (useRealpath) {
      if (isAbs) {
        curPath = dirname(request)
        request = basename(request)
      }

      curPath = realpath(curPath)

      if (! curPath) {
        continue
      }
    }

    let thePath

    if (isAbs) {
      thePath = useRealpath
        ? curPath + sep + request
        : request
    } else {
      thePath = resolve(curPath, request)
    }

    let isSymLink = false
    let rc = -1
    let stat = null

    if (isJS(thePath) ||
        isMJS(thePath)) {
      stat = statSync(thePath)

      if (stat) {
        rc = call(isFile, stat) ? 0 : 1

        if (rc &&
            call(isSymbolicLink, stat)) {
          isSymLink = true
          rc = statFast(thePath)
        }
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
             stat.nlink > 1 ||
             isSymLink)) {
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

      if (useRealpath) {
        thePath = realpath(thePath)
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
  let isSymLink = false
  let rc = -1
  let stat = null

  if (isJS(filename) ||
      isMJS(filename)) {
    stat = statSync(filename)

    if (stat) {
      rc = call(isFile, stat) ? 0 : 1

      if (rc &&
          call(isSymbolicLink, stat)) {
        isSymLink = true
        rc = statFast(filename)
      }
    }
  } else {
    rc = statFast(filename)
  }

  if (rc) {
    return ""
  }

  const useRealpath = isMain
    ? resolveSymlinksMain
    : resolveSymlinks

  if (useRealpath &&
      (! stat ||
       stat.nlink > 1 ||
       isSymLink)) {
    return realpath(filename)
  }

  return filename
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
