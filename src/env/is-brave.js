import shared from "../shared.js"
import { versions } from "../safe/process.js"

function init() {
  function isBrave() {
    return Reflect.has(versions, "Brave")
  }

  return isBrave
}

export default shared.inited
  ? shared.module.envIsBrave
  : shared.module.envIsBrave = init()
