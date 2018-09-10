import get from "./get.js"
import realProcess from "../real/process.js"
import shared from "../shared.js"

function init() {
  function getEnv(name) {
    return get(realProcess.env, name)
  }

  return getEnv
}

export default shared.inited
  ? shared.module.utilGetEnv
  : shared.module.utilGetEnv = init()
