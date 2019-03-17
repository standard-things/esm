import INSPECT from "../constant/inspect.js"

import { inspect, types } from "../safe/util.js"

import OwnProxy from "../own/proxy.js"

import binding from "../binding.js"
import getProxyDetails from "./get-proxy-details.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  if (typeof (types && types.isProxy) === "function") {
    return types.isProxy
  }

  const {
    PROXY_PREFIX
  } = INSPECT

  const liteInspectOptions = {
    breakLength: Infinity,
    colors: false,
    compact: true,
    customInspect: false,
    depth: 0,
    maxArrayLength: 0,
    showHidden: false,
    showProxy: true
  }

  let useGetProxyDetails

  return function isProxyFallback(value) {
    if (OwnProxy.instances.has(value)) {
      return true
    }

    if (useGetProxyDetails === void 0) {
      useGetProxyDetails = typeof binding.util.getProxyDetails === "function"
    }

    if (useGetProxyDetails) {
      return !! getProxyDetails(value)
    }

    return shared.support.inspectProxies &&
           isObjectLike(value) &&
           inspect(value, liteInspectOptions).startsWith(PROXY_PREFIX)
  }
}

export default shared.inited
  ? shared.module.utilIsProxy
  : shared.module.utilIsProxy = init()
