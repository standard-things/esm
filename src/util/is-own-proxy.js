import { inspect } from "util"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

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

  if (shared.own.Proxy.instances.has(value)) {
    return true
  }

  if (shared.support.inspectProxies) {
    const inspected = inspect(value, inspectOptions)

    return inspected.startsWith("Proxy ") &&
      inspected.endsWith("'@std/esm': 1 } ]")
  }
}

export default isOwnProxy
