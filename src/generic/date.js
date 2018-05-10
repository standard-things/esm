import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  return {
    getTime: unapply(Date.prototype.getTime)
  }
}

export default shared.inited
  ? shared.module.GenericDate
  : shared.module.GenericDate = init()
