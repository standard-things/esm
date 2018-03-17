import functionPrototypeToString from "./shim/function-prototype-to-string.js"
import shared from "./shared.js"

function init() {
  return {
    __proto__: null,
    enable(context) {
      functionPrototypeToString.enable(context)
      return context
    }
  }
}

export default shared.inited
  ? shared.Shim
  : shared.Shim = init()
