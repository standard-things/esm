import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  const { apply } = Reflect
  const { prototype } = Function

  return {
    __proto__: null,
    apply,
    bind: unapply(prototype.bind),
    call: (target, thisArg, ...args) => apply(target, thisArg, args),
    toString: unapply(prototype.toString)
  }
}

export default shared.inited
  ? shared.generic.Function
  : shared.generic.Function = init()
