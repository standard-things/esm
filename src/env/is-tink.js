import normalize from "../path/normalize.js"
import shared from "../shared.js"

function init() {
  function isTink() {
    const { parent } = __non_webpack_module__
    const filename = normalize(parent != null && parent.filename)
    const nodeModulesIndex = filename.lastIndexOf("/node_modules/")

    if (nodeModulesIndex === -1) {
      return false
    }

    const start = nodeModulesIndex + 14
    const end = filename.indexOf("/", start)

    return end !== -1 &&
      filename.slice(start, end) === "tink"
  }

  return isTink
}

export default shared.inited
  ? shared.module.envIsTink
  : shared.module.envIsTink = init()
