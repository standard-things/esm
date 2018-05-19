import shared from "../shared.js"

function init() {
  const backSlashRegExp = /\\/g

  function normalize(filename) {
    if (typeof filename !== "string") {
      return ""
    }

    return shared.env.win32
      ? filename.replace(backSlashRegExp, "/")
      : filename
  }

  return normalize
}

export default shared.inited
  ? shared.module.pathNormalize
  : shared.module.pathNormalize = init()
