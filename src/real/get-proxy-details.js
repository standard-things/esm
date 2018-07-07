import binding from "../binding.js"
import realRequire from "./require.js"
import shared from "../shared.js"

function init() {
  let result

  try {
    result = realRequire(shared.symbol.realGetProxyDetails)

    if (typeof result === "function") {
      return result
    }
  } catch (e) {}

  result = binding.util.getProxyDetails

  if (typeof result === "function") {
    return result
  }
}

export default shared.inited
  ? shared.module.realGetProxyDetails
  : shared.module.realGetProxyDetails = init()
