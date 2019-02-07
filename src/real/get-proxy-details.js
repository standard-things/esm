import binding from "../binding.js"
import isObjectLike from "../util/is-object-like.js"
import safeRequire from "../safe/require.js"
import shared from "../shared.js"

function init() {
  let realGetProxyDetails = safeRequire(shared.symbol.realGetProxyDetails)

  if (typeof realGetProxyDetails === "function") {
    return realGetProxyDetails
  }

  let useGetProxyDetails

  // Define as a function expression in case it is ever proxy wrapped in the future.
  realGetProxyDetails = function (value) {
    if (useGetProxyDetails === void 0) {
      useGetProxyDetails = typeof binding.util.getProxyDetails === "function"
    }

    if (useGetProxyDetails &&
        isObjectLike(value)) {
      try {
        return binding.util.getProxyDetails(value)
      } catch {}
    }
  }

  return realGetProxyDetails
}

export default shared.inited
  ? shared.module.realGetProxyDetails
  : shared.module.realGetProxyDetails = init()
