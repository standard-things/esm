import binding from "../binding.js"
import safeRequire from "../safe/require.js"
import shared from "../shared.js"

function init() {
  let realGetProxyDetails = safeRequire(shared.symbol.realGetProxyDetails)

  if (typeof realGetProxyDetails === "function") {
    return realGetProxyDetails
  }

  let useGetProxyDetails

  realGetProxyDetails = function (value) {
    if (useGetProxyDetails === void 0) {
      useGetProxyDetails = typeof binding.util.getProxyDetails === "function"
    }

    if (useGetProxyDetails) {
      return binding.util.getProxyDetails(value)
    }
  }

  return realGetProxyDetails
}

export default shared.inited
  ? shared.module.realGetProxyDetails
  : shared.module.realGetProxyDetails = init()
