import { inspect, types } from "../safe/util.js"

import OwnProxy from "../own/proxy.js"

import getProxyDetails from "../util/get-proxy-details.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  let inspectDepth = 0

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

  function isProxyFallback(value) {
    if (shared.support.getProxyDetails) {
      return !! getProxyDetails(value)
    }

    if (OwnProxy.instances.has(value)) {
      return true
    }

    if (! shared.support.inspectProxies ||
        ! isObjectLike(value) ||
        ++inspectDepth !== 1) {
      return false
    }

    let inspected

    try {
      inspected = inspect(value, liteInspectOptions)
    } finally {
      inspectDepth -= 1
    }

    return inspected.startsWith("Proxy")
  }

  return typeof (types && types.isProxy) === "function"
    ? types.isProxy
    : isProxyFallback
}

export default shared.inited
  ? shared.module.utilIsProxy
  : shared.module.utilIsProxy = init()
