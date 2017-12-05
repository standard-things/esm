import isAbsolutePath from "./is-absolute-path.js"
import isRelativePath from "./is-relative-path.js"

function isPath(value) {
  return isRelativePath(value) || isAbsolutePath(value)
}

export default isPath
