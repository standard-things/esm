import { isAbsolute as _isAbsolutePath } from "path"

function isAbsolutePath(value) {
  return typeof value === "string" && _isAbsolutePath(value)
}

export default isAbsolutePath
