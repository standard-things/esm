import shared from "../shared.js"
import unapply from "../util/unapply.js"

const { apply } = Reflect

function init() {
  return {
    __proto__: null,
    apply,
    call: (target, thisArg, ...args) => apply(target, thisArg, args),
    toString: unapply(Function.prototype.toString)
  }
}

export default shared.inited
  ? shared.generic.Function
  : shared.generic.Function = init()
