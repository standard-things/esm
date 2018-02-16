import SafeFunction from "../builtin/function.js"

import apply from "../util/apply.js"
import call from "../util/call.js"
import shared from "../shared.js"
import unapply from "../util/unapply.js"

function init() {
  const funcProto = SafeFunction.prototype

  return {
    __proto__: null,
    apply,
    bind: unapply(funcProto.bind),
    call,
    toString: unapply(funcProto.toString)
  }
}

export default shared.inited
  ? shared.generic.Function
  : shared.generic.Function = init()
