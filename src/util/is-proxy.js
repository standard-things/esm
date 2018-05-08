import { inspect, types } from "../safe/util.js"

import OwnProxy from "../own/proxy.js"

import getProxyDetails from "./get-proxy-details.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  if (typeof (types && types.isProxy) === "function") {
    return types.isProxy
  }

  const liteInspectOptions = {
    __proto__: null,
    breakLength: Infinity,
    colors: false,
    compact: true,
    customInspect: false,
    depth: 0,
    maxArrayLength: 0,
    showHidden: false,
    showProxy: true
  }

  return function isProxyFallback(value) {
    if (shared.support.getProxyDetails) {
      return !! getProxyDetails(value)
    }

    if (OwnProxy.instances.has(value)) {
      return true
    }

    return shared.support.inspectProxies &&
      isObjectLike(value) &&
      inspect(value, liteInspectOptions).startsWith("Proxy")
  }
}

export default shared.inited
  ? shared.module.utilIsProxy
  : shared.module.utilIsProxy = init()
