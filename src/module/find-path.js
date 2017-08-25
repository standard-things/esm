// Based on Node's `Module._findPath` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/module.js

import { isAbsolute, resolve } from "path"
import binding from "../binding.js"
import keys from "../util/keys.js"
import moduleState from "./state.js"
import readFile from "../fs/read-file.js"
import { realpathSync } from "fs"
import stat from "../fs/stat.js"

const codeOfSlash = "/".charCodeAt(0)

const exts = [".mjs", ".js", ".json", ".node"]
const { preserveSymlinks } = binding.config

const packageMainCache = Object.create(null)
const pathCache = Object.create(null)

function findPath(id, parent, paths, isMain) {
  const extensions = parent
    ? parent.constructor._extensions
    : moduleState._extensions

  if (isAbsolute(id)) {
    paths = [""]
  } else if (! paths || ! paths.length) {
    return false
  }

  const cacheKey = id + "\0" +
    (paths.length === 1 ? paths[0] : paths.join("\0"))

  if (cacheKey in pathCache) {
    return pathCache[cacheKey]
  }

  let exts
  const trailingSlash = id.length > 0 &&
    id.charCodeAt(id.length - 1) === codeOfSlash

  for (const curPath of paths) {
    if (curPath && stat(curPath) < 1) {
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
          filePath = realpathSync(basePath)
        }
      } else if (isDir) {
        if (exts === void 0) {
          exts = keys(extensions)
        }

        filePath = tryPackage(basePath, exts, isMain)
      }

      if (! filePath) {
        if (exts === void 0) {
          exts = keys(extensions)
        }

        filePath = tryExtensions(basePath, exts, isMain)
      }
    }

    if (isDir && ! filePath) {
      if (exts === void 0) {
        exts = keys(extensions)
      }

      filePath = tryPackage(basePath, exts, isMain)
    }

    if (isDir && ! filePath) {
      if (exts === void 0) {
        exts = keys(extensions)
      }

      filePath = tryExtensions(resolve(basePath, "index"), exts, isMain)
    }

    if (filePath) {
      pathCache[cacheKey] = filePath
      return filePath
    }
  }

  return false
}

function readPackage(thePath) {
  if (thePath in packageMainCache) {
    return packageMainCache[thePath]
  }

  const jsonPath = resolve(thePath, "package.json")
  const json = readFile(jsonPath, "utf8")

  if (json === null) {
    return false
  }

  let pkg

  try {
    pkg = packageMainCache[thePath] = JSON.parse(json).main
  } catch (e) {
    e.path = jsonPath
    e.message = "Error parsing " + jsonPath + ": " + e.message
    throw e
  }

  return pkg
}

function tryExtensions(thePath, exts, isMain) {
  for (const ext of exts) {
    const filePath = tryFile(thePath + ext, isMain)

    if (filePath) {
      return filePath
    }
  }

  return false
}

function tryFile(thePath, isMain) {
  const rc = stat(thePath)

  return preserveSymlinks && ! isMain
    ? (rc === 0 && resolve(thePath))
    : (rc === 0 && realpathSync(thePath))
}

function tryPackage(thePath, exts, isMain) {
  const pkg = readPackage(thePath)

  if (! pkg) {
    return false
  }

  const filePath = resolve(thePath, pkg)

  return tryFile(filePath, isMain) ||
         tryExtensions(filePath, exts, isMain) ||
         tryExtensions(resolve(filePath, "index"), exts, isMain)
}

export default findPath
