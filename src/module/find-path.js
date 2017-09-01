// Based on Node's `Module._findPath` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import { isAbsolute, resolve } from "path"
import binding from "../binding.js"
import emitDeprecationWarning from "../error/emit-deprecation-warning.js"
import keys from "../util/keys.js"
import moduleState from "./state.js"
import readFile from "../fs/read-file.js"
import realpath from "../fs/realpath.js"
import { satisfies } from "semver"
import stat from "../fs/stat.js"

const codeOfSlash = "/".charCodeAt(0)

const { parse } = JSON
const { preserveSymlinks } = binding.config
const skipOutsideDot = satisfies(process.version, ">=9")
let warned = false

const packageMainCache = Object.create(null)
const pathCache = Object.create(null)

function findPath(id, paths, isMain, parent, skipWarnings, skipGlobalPaths, searchExts) {
  const { _extensions } = parent ? parent.constructor : moduleState

  if (isAbsolute(id)) {
    paths = [""]
  } else if (! paths || ! paths.length) {
    return ""
  }

  const cacheKey = id + "\0" +
    (paths.length === 1 ? paths[0] : paths.join("\0"))

  if (cacheKey in pathCache) {
    return pathCache[cacheKey]
  }

  const trailingSlash = id.length > 0 &&
    id.charCodeAt(id.length - 1) === codeOfSlash

  let i = -1
  const pathsCount = paths.length

  while (++i < pathsCount) {
    const curPath = paths[i]

    if (curPath && stat(curPath) !== 1) {
      continue
    }

    let filePath
    const basePath = resolve(curPath, id)
    const rc = stat(basePath)
    const isFile = rc === 0
    const isDir = rc === 1

    if (! trailingSlash) {
      if (isFile) {
        if (preserveSymlinks && ! isMain) {
          filePath = resolve(basePath)
        } else {
          filePath = realpath(basePath)
        }
      } else if (isDir) {
        if (searchExts === void 0) {
          searchExts = keys(_extensions)
        }

        filePath = tryPackage(basePath, searchExts, isMain)
      }

      if (! filePath) {
        if (searchExts === void 0) {
          searchExts = keys(_extensions)
        }

        filePath = tryExtensions(basePath, searchExts, isMain)
      }
    }

    if (isDir && ! filePath) {
      if (searchExts === void 0) {
        searchExts = keys(_extensions)
      }

      filePath = tryPackage(basePath, searchExts, isMain)
    }

    if (isDir && ! filePath) {
      if (searchExts === void 0) {
        searchExts = keys(_extensions)
      }

      filePath = tryExtensions(resolve(basePath, "index"), searchExts, isMain)
    }

    if (filePath) {
      // Warn once if "." resolved outside the module directory.
      if (id === "." &&
          i > 0 &&
          ! warned &&
          ! skipGlobalPaths &&
          ! skipOutsideDot &&
          ! skipWarnings) {
        warned = true

        emitDeprecationWarning(
          "require('.') resolved outside the package directory. " +
          "This functionality is deprecated and will be removed soon.",
          "DEP0019"
        )
      }

      return pathCache[cacheKey] = filePath
    }
  }

  return ""
}

function readPackage(thePath) {
  if (thePath in packageMainCache) {
    return packageMainCache[thePath]
  }

  const jsonPath = resolve(thePath, "package.json")
  const json = readFile(jsonPath, "utf8")

  if (json === null) {
    return ""
  }

  let main

  try {
    ({ main } = parse(json))
  } catch (e) {
    e.path = jsonPath
    e.message = "Error parsing " + jsonPath + ": " + e.message
    throw e
  }

  return typeof main === "string"
    ? packageMainCache[thePath] = main
    : ""
}

function tryExtensions(thePath, exts, isMain) {
  let filePath = ""

  for (const ext of exts) {
    filePath = tryFile(thePath + ext, isMain)

    if (filePath) {
      return filePath
    }
  }

  return filePath
}

function tryFile(thePath, isMain) {
  const isFile = stat(thePath) === 0

  return preserveSymlinks && ! isMain
    ? (isFile && resolve(thePath))
    : (isFile && realpath(thePath))
}

function tryPackage(thePath, exts, isMain) {
  const mainPath = readPackage(thePath)

  if (! mainPath) {
    return mainPath
  }

  const filePath = resolve(thePath, mainPath)

  return tryFile(filePath, isMain) ||
         tryExtensions(filePath, exts, isMain) ||
         tryExtensions(resolve(filePath, "index"), exts, isMain)
}

export default findPath
