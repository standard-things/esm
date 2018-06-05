import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  return {
    bind: unapply(Function.prototype.bind)
  }
}

export default shared.inited
  ? shared.module.GenericFunction
  : shared.module.GenericFunction = init()
