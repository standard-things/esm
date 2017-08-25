import { extname, resolve } from "path"
import FastObject from "../fast-object.js"

import binding from "../binding.js"
import isFile from "../util/is-file.js"
import isPath from "../util/is-path.js"
import { realpathSync } from "fs"
import resolveFilename from "../module/resolve-filename.js"

const exts = [".mjs", ".js", ".json", ".node"]
const { preserveSymlinks } = binding.config

const realCache = new FastObject

function resolveFilePath(id, parent, isMain, skipGlobalPaths) {
  if (! isPath(id)) {
    return resolveRealPath(id, parent, isMain, skipGlobalPaths)
  }

  const parentFilename = parent && parent.filename

  let resPath = parentFilename
    ? resolve(parentFilename, "..", id)
    : resolve(id)

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

function realPath(id) {
  try {
    return realpathSync(id)
  } catch (e) {}
  return ""
}

function resolveRealPath(id, parent, isMain, skipGlobalPaths) {
  try {
    return resolveFilename(id, parent, isMain, skipGlobalPaths)
  } catch (e) {}
  return ""
}

export default resolveFilePath
