import { extname, isAbsolute, join } from "path"
import FastObject from "../fast-object.js"

import { _resolveFilename } from "module"
import binding from "../binding.js"
import isFile from "../fs/is-file.js"
import isPath from "./is-path.js"

const exts = [".mjs", ".js", ".json", ".node"]
const { preserveSymlinks } = binding.config

const realCache = new FastObject

function resolveFilePath(request, parent, isMain) {
  if (! isPath(request)) {
    return resolveRealPath(request, parent, isMain)
  }

  let resPath = resolvePath(request, parent)

  if (! extname(resPath)) {
    const ext = findExt(resPath, parent)

    if (! ext) {
      return ""
    }

    resPath += ext
  }

  if (preserveSymlinks && ! isMain) {
    return resPath
  }

  if (resPath in realCache) {
    return realCache[resPath]
  }

  return realCache[resPath] = resolveRealPath(resPath, parent, isMain)
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

function resolvePath(request, parent) {
  return isAbsolute(request) ? request : join(parent.filename, "..", request)
}

function resolveRealPath(request, parent, isMain) {
  try {
    return _resolveFilename(request, parent, isMain)
  } catch (e) {}
  return ""
}

export default resolveFilePath
