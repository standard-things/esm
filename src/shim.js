import shared from "./shared.js"
import shimFunctionPrototypeToString from "./shim/function-prototype-to-string.js"

function init() {
  const Shim = {
    __proto__: null,
    enable(context) {
      shimFunctionPrototypeToString.enable(context)
      return context
    }
  }

  return Shim
}

export default shared.inited
  ? shared.module.Shim
  : shared.module.Shim = init()
