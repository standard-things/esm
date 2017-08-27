import _resolveFilename from "../resolve-filename.js"
import errors from "../../errors.js"

function resolveFilename(id, parent, isMain) {
  const filePath = _resolveFilename(id, parent, isMain)

  if (filePath) {
    return filePath
  }

  throw new errors.Error("ERR_MISSING_MODULE", id)
}

export default resolveFilename
