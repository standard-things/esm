import ESM from "../constant/esm.js"

import OwnProxy from "../own/proxy.js"

import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  const {
    PKG_PREFIX
  } = ESM

  const inspectOptions = {
    __proto__: null,
    breakLength: 0,
    colors: false,
    compact: true,
    customInspect: false,
    depth: 1,
    maxArrayLength: 0,
    showHidden: false,
    showProxy: true
  }

  function isOwnProxy(value) {
    if (! isObjectLike(value)) {
      return false
    }

    if (OwnProxy.instances.has(value)) {
      return true
    }

    if (shared.support.inspectProxies) {
      const inspected = shared.util.inspect(value, inspectOptions)

      return inspected.startsWith("Proxy") &&
        inspected.endsWith("'" + PKG_PREFIX + ":proxy': 1 } ]")
    }
  }

  return isOwnProxy
}

export default shared.inited
  ? shared.module.isOwnProxy
  : shared.module.isOwnProxy = init()
