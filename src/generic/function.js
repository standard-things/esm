import apply from "../util/apply.js"
import call from "../util/call.js"
import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  return {
    __proto__: null,
    apply,
    call,
    toString: unapply(Function.prototype.toString)
  }
}

export default shared.inited
  ? shared.generic.Function
  : shared.generic.Function = init()
