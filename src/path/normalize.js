import { platform } from "../safe/process.js"
import shared from "../shared.js"

function init() {
  const backwardSlashRegExp = /\\/g
  const isWin = platform === "win32"

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
