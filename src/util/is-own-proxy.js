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

  const endMarkerRegExp = new RegExp(
    "[\\[\"']" +
    PKG_PREFIX +
    ":proxy['\"\\]]\\s*:\\s*1\\s*\\}\\s*.?$"
  )

  const deepInspectOptions = {
    __proto__: null,
    breakLength: 0,
    colors: false,
    compact: true,
    customInspect: false,
    depth: 2,
    maxArrayLength: 0,
    showHidden: true,
    showProxy: true
  }

  const shallowInspectOptions = { __proto__: null }

  for (const name in deepInspectOptions) {
    shallowInspectOptions[name] = deepInspectOptions[name]
  }

  shallowInspectOptions.depth = 0

  function isOwnProxy(value) {
    if (! isObjectLike(value)) {
      return false
    }

    return OwnProxy.instances.has(value) ||
      isOwnProxyFallback(value)
  }

  function isOwnProxyFallback(value) {
    if (! shared.support.inspectProxies ||
        ++inspectDepth !== 1) {
      return false
    }

    let inspected

    try {
      inspected = inspect(value, shallowInspectOptions)
    } finally {
      inspectDepth -= 1
    }

    if (! inspected.startsWith("Proxy")) {
      return false
    }

    inspectDepth += 1

    try {
      inspected = inspect(value, deepInspectOptions)
    } finally {
      inspectDepth -= 1
    }

    return endMarkerRegExp.test(inspected)
  }

  return isOwnProxy
}

export default shared.inited
  ? shared.module.utilIsOwnProxy
  : shared.module.utilIsOwnProxy = init()
