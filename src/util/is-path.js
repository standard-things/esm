import isAbsolutePath from "./is-absolute-path.js"
import isRelativePath from "./is-relative-path.js"
import shared from "../shared.js"

function init() {
  function isPath(value) {
    return isRelativePath(value) || isAbsolutePath(value)
  }

  return isPath
}

export default shared.inited
  ? shared.module.utilIsPath
  : shared.module.utilIsPath = init()
