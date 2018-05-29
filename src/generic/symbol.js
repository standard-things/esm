import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  return {
    toString: unapply(Symbol.prototype.toString)
  }
}

export default shared.inited
  ? shared.module.GenericSymbol
  : shared.module.GenericSymbol = init()
