import isWin32 from "../env/is-win32.js"
import shared from "../shared.js"

function init() {
  const WIN32 = isWin32()

  const backwardSlashRegExp = /\\/g

  function normalize(filename) {
    if (typeof filename !== "string") {
      return ""
    }

    return WIN32
      ? filename.replace(backwardSlashRegExp, "/")
      : filename
  }

  return normalize
}

export default shared.inited
  ? shared.module.pathNormalize
  : shared.module.pathNormalize = init()
