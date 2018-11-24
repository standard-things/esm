import shared from "../shared.js"
import { versions } from "../safe/process.js"

function init() {
  function isNdb() {
    return Reflect.has(versions, "ndb")
  }

  return isNdb
}

export default shared.inited
  ? shared.module.envIsNdb
  : shared.module.envIsNdb = init()
