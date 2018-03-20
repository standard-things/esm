import shared from "./shared.js"
import shimFunctionPrototypeToString from "./shim/function-prototype-to-string.js"
import shimProcessBindingUtilGetProxyDetails from "./shim/process-binding-util-get-proxy-details.js"

function init() {
  const Shim = {
    __proto__: null,
    enable(context) {
      shimFunctionPrototypeToString.enable(context)
      shimProcessBindingUtilGetProxyDetails.enable(context)
      return context
    }
  }

  return Shim
}

export default shared.inited
  ? shared.module.Shim
  : shared.module.Shim = init()
