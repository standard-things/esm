import _resolveFilename from "../_resolve-filename.js"
import errors from "../../errors.js"

function resolveFilename(id, parent, isMain, options) {
  const filePath = _resolveFilename(id, parent, isMain, options)

  if (filePath) {
    return filePath
  }

  throw new errors.Error("ERR_MISSING_MODULE", id)
}

export default resolveFilename
