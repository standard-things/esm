import binding from "../binding.js"
import realRequire from "./require.js"
import shared from "../shared.js"

function init() {
  try {
    const result = realRequire(shared.symbol.realGetProxyDetails)

    if (typeof result === "function") {
      return result
    }
  } catch (e) {}

  return binding.util.getProxyDetails
}

export default shared.inited
  ? shared.module.realGetProxyDetails
  : shared.module.realGetProxyDetails = init()
