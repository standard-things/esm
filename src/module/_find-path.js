// Based on Node's `Module._findPath` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import { isAbsolute, resolve } from "path"

import Module from "../module.js"

import binding from "../binding.js"
import readFileFast from "../fs/read-file-fast.js"
import realpath from "../fs/realpath.js"
import shared from "../shared.js"
import stat from "../fs/stat.js"

const { keys } = Object
const { parse } = JSON

const isWin = process.platform === "win32"
const mainFieldRegExp = /"main"/
const { preserveSymlinks } = binding.config

function findPath(request, paths, isMain, searchExts) {
  if (isAbsolute(request)) {
    paths = [""]
  } else if (! paths || ! paths.length) {
    return ""
  }

  const cacheKey =
    request + "\0" +
    (paths.length === 1 ? paths[0] : paths.join("\0"))

  if (cacheKey in shared.findPath) {
    return shared.findPath[cacheKey]
  }

  let trailingSlash = request.length > 0

  if (trailingSlash) {
    const code = request.charCodeAt(request.length - 1)
    trailingSlash = code === 47 /* / */

    if (isWin &&
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
      return shared.findPath[cacheKey] = filename
    }
  }

  return ""
}

function readPackage(thePath) {
  if (thePath in shared.package) {
    return shared.package[thePath]
  }

  const jsonPath = resolve(thePath, "package.json")
  const json = readFileFast(jsonPath, "utf8")

  if (! json ||
      ! mainFieldRegExp.test(json)) {
    return ""
  }

  let main

  try {
    main = parse(json).main
  } catch (e) {
    e.path = jsonPath
    e.message = "Error parsing " + jsonPath + ": " + e.message
    throw e
  }

  return typeof main === "string"
    ? shared.package[thePath] = main
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
