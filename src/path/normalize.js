import isWin32 from "../env/is-win32.js"
import shared from "../shared.js"

function init() {
  const WIN32 = isWin32()

  const backwardSlashRegExp = /\\/g

  function posixNormalize(filename) {
    return typeof filename === "string"
      ? filename
      : ""
  }

  function win32Normalize(filename) {
    return typeof filename === "string"
      ? filename.replace(backwardSlashRegExp, "/")
      : ""
  }

  return WIN32
    ? win32Normalize
    : posixNormalize
}

export default shared.inited
  ? shared.module.pathNormalize
  : shared.module.pathNormalize = init()
