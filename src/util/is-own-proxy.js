import ESM from "../constant/esm.js"

import OwnProxy from "../own/proxy.js"

import { inspect } from "../safe/util.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  const {
    PKG_PREFIX
  } = ESM

  let inspectDepth = 0

  const inspectOptions = {
    __proto__: null,
    breakLength: 0,
    colors: false,
    compact: true,
    customInspect: false,
    depth: 1,
    maxArrayLength: 0,
    showHidden: true,
    showProxy: true
  }

  function isOwnProxy(value) {
    if (! isObjectLike(value)) {
      return false
    }

    if (OwnProxy.instances.has(value)) {
      return true
    }

    if (shared.support.inspectProxies &&
      ++inspectDepth === 1) {
      const inspected = inspect(value, inspectOptions)

      inspectDepth -= 1

      return inspected.startsWith("Proxy") &&
        inspected.endsWith("'" + PKG_PREFIX + ":proxy': 1 } ]")
    }

    return false
  }

  return isOwnProxy
}

export default shared.inited
  ? shared.module.utilIsOwnProxy
  : shared.module.utilIsOwnProxy = init()
