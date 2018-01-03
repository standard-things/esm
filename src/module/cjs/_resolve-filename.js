import _resolveFilename from "../_resolve-filename.js"
import getModuleName from "../../util/get-module-name.js"
import shared from "../../shared.js"
import toStringLiteral from "../../util/to-string-literal.js"

function resolveFilename(id, parent, isMain) {
  const cacheKey = id + "\0" + getModuleName(parent) + "\0" + isMain

  if (cacheKey in shared.resolveFilename) {
    return shared.resolveFilename[cacheKey]
  }

  const filePath = _resolveFilename(id, parent, isMain)

  if (filePath) {
    return shared.resolveFilename[cacheKey] = filePath
  }

  const error = new Error("Cannot find module " + toStringLiteral(id, "'"))
  error.code = "MODULE_NOT_FOUND"
  throw error
}

export default resolveFilename
