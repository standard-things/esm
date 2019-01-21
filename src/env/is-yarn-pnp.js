import shared from "../shared.js"
import { versions } from "../safe/process.js"

function init() {
  function isYarnPnP() {
    return Reflect.has(versions, "pnp")
  }

  return isYarnPnP
}

export default shared.inited
  ? shared.module.envIsYarnPnP
  : shared.module.envIsYarnPnP = init()
