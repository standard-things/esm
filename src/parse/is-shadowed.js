import getShadowed from "./get-shadowed.js"
import shared from "../shared.js"

function init() {
  function isShadowed(path, name, map) {
    return getShadowed(path, name, map) !== null
  }

  return isShadowed
}

export default shared.inited
  ? shared.module.parseIsShadowed
  : shared.module.parseIsShadowed = init()
