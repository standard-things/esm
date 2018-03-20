import binding from "../binding.js"
import shared from "../shared.js"

function init() {
  let realGetProxyDetails = binding.util.getProxyDetails

  try {
    const result = realGetProxyDetails(shared.symbol.realGetProxyDetails)

    if (typeof result === "function") {
      realGetProxyDetails = result
    }
  } catch (e) {}

  return realGetProxyDetails
}

export default shared.inited
  ? shared.module.realGetProxyDetails
  : shared.module.realGetProxyDetails = init()
