import isWin32 from "../env/is-win32.js"
import shared from "../shared.js"

function init() {
  const backwardSlashRegExp = /\\/g
  const isWin = isWin32()

  function normalize(filename) {
    if (typeof filename !== "string") {
      return ""
    }

    return isWin
      ? filename.replace(backwardSlashRegExp, "/")
      : filename
  }

  return normalize
}

export default shared.inited
  ? shared.module.pathNormalize
  : shared.module.pathNormalize = init()
