import shared from "../shared.js"
import { versions } from "../safe/process.js"

function init() {
  function isChakra() {
    return Reflect.has(versions, "chakracore")
  }

  return isChakra
}

export default shared.inited
  ? shared.module.envIsChakra
  : shared.module.envIsChakra = init()
