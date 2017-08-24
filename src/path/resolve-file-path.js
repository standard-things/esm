import { extname, resolve } from "path"
import FastObject from "../fast-object.js"

import binding from "../binding.js"
import isFile from "../fs/is-file.js"
import isPath from "./is-path.js"
import { realpathSync } from "fs"
import resolveFilename from "../module/resolve-filename.js"

const exts = [".mjs", ".js", ".json", ".node"]
const { preserveSymlinks } = binding.config

const realCache = new FastObject

function resolveFilePath(request, parent, isMain, skipGlobalPaths) {
  if (! isPath(request)) {
    return resolveRealPath(request, parent, isMain, skipGlobalPaths)
  }

  const parentFilename = parent && parent.filename

  let resPath = parentFilename
    ? resolve(parentFilename, "..", request)
    : resolve(request)

  if (! extname(resPath)) {
    let ext = findExt(resPath, parent)

    if (! ext) {
      resPath = resolve(resPath, "index")
      ext = findExt(resPath, parent)

      if (! ext) {
        return ""
      }
    }

    resPath += ext
  }

  if (preserveSymlinks && ! isMain) {
    return resPath
  }

  if (resPath in realCache) {
    return realCache[resPath]
  }

  return realCache[resPath] = realPath(resPath)
}

function findExt(filePath, parent) {
  // Enforce file extension search order:
  // https://github.com/nodejs/node-eps/blob/master/002-es-modules.md#3313-file-search
  for (const ext of exts) {
    if (isFile(filePath + ext)) {
      return ext
    }
  }

  return ""
}

function realPath(request) {
  try {
    return realpathSync(request)
  } catch (e) {}
  return ""
}

function resolveRealPath(request, parent, isMain, skipGlobalPaths) {
  try {
    return resolveFilename(request, parent, isMain, skipGlobalPaths)
  } catch (e) {}
  return ""
}

export default resolveFilePath
