// Based on Node's `Module._findPath` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import { isAbsolute, resolve } from "path"

import GenericArray from "../generic/array.js"
import GenericRegExp from "../generic/regexp.js"
import GenericString from "../generic/string.js"
import Module from "../module.js"
import SafeJSON from "../builtin/json.js"

import binding from "../binding.js"
import keys from "../util/keys.js"
import readFileFast from "../fs/read-file-fast.js"
import realpath from "../fs/realpath.js"
import shared from "../shared.js"
import stat from "../fs/stat.js"

const { preserveSymlinks } = binding.config

const mainFieldRegExp = /"main"/

function findPath(request, paths, isMain, searchExts) {
  if (isAbsolute(request)) {
    paths = [""]
  } else if (! paths || ! paths.length) {
    return ""
  }

  const cache = shared.findPath

  const cacheKey =
    request + "\0" +
    (paths.length === 1
      ? paths[0]
      : GenericArray.join(paths, "\0"))

  if (cacheKey in cache) {
    return cache[cacheKey]
  }

  let trailingSlash = request.length > 0

  if (trailingSlash) {
    const code = GenericString.charCodeAt(request, request.length - 1)
    trailingSlash = code === 47 /* / */

    if (shared.env.win32 &&
        ! trailingSlash) {
      trailingSlash = code === 92 /* \ */
    }
  }

  let i = -1
  const pathsCount = paths.length

  while (++i < pathsCount) {
    const curPath = paths[i]

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
        if (preserveSymlinks &&
            ! isMain) {
          filename = resolve(basePath)
        } else {
          filename = realpath(basePath)
        }
      } else if (isDir) {
        if (searchExts === void 0) {
          searchExts = keys(Module._extensions)
        }

        filename = tryPackage(basePath, searchExts, isMain)
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

function readPackage(thePath) {
  const cache = shared.readPackage

  if (thePath in cache) {
    return cache[thePath]
  }

  const jsonPath = resolve(thePath, "package.json")
  const json = readFileFast(jsonPath, "utf8")

  if (! json ||
      ! GenericRegExp.test(mainFieldRegExp, json)) {
    return ""
  }

  let main

  try {
    main = SafeJSON.parse(json).main
  } catch (e) {
    e.path = jsonPath
    e.message = "Error parsing " + jsonPath + ": " + e.message
    throw e
  }

  return typeof main === "string"
    ? cache[thePath] = main
    : ""
}

function tryExtensions(thePath, exts, isMain) {
  let filename = ""

  for (const ext of exts) {
    filename = tryFile(thePath + ext, isMain)

    if (filename) {
      return filename
    }
  }

  return filename
}

function tryFile(thePath, isMain) {
  if (stat(thePath)) {
    return false
  }

  if (preserveSymlinks &&
      ! isMain) {
    return resolve(thePath)
  }

  return realpath(thePath)
}

function tryPackage(thePath, exts, isMain) {
  const mainPath = readPackage(thePath)

  if (! mainPath) {
    return mainPath
  }

  const filename = resolve(thePath, mainPath)

  return tryFile(filename, isMain) ||
         tryExtensions(filename, exts, isMain) ||
         tryExtensions(resolve(filename, "index"), exts, isMain)
}

export default findPath
