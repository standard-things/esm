import { resolve } from "../safe/path.js"
import shared from "../shared.js"

function init() {
  const backSlashRegExp = /\\/g

  function normalize(filename) {
    if (typeof filename !== "string") {
      return ""
    }

    const resolved = resolve(filename)
    return resolved.replace(backSlashRegExp, "/")
  }

  return normalize
}

export default shared.inited
  ? shared.module.pathNormalize
  : shared.module.pathNormalize = init()
