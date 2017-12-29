import _resolveFilename from "../_resolve-filename.js"
import errors from "../../errors.js"
import getModuleName from "../../util/get-module-name.js"
import shared from "../../shared.js"

function resolveFilename(id, parent, isMain) {
  const cacheKey = id + "\0" + getModuleName(parent) + "\0" + isMain

  if (cacheKey in shared.resolveFilename) {
    return shared.resolveFilename[cacheKey]
  }

  const filePath = _resolveFilename(id, parent, isMain)

  if (filePath) {
    return shared.resolveFilename[cacheKey] = filePath
  }

  throw new errors.Error("ERR_MISSING_MODULE", id)
}

export default resolveFilename
