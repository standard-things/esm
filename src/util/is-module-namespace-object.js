import isObjectLike from "./is-object-like.js"
import isOwnProxy from "./is-own-proxy.js"
import shared from "../shared.js"

function init() {
  function isModuleNamespaceObject(value) {
    return isObjectLike(value) &&
      Reflect.has(value, shared.symbol.namespace) &&
      isOwnProxy(value)
  }

  return isModuleNamespaceObject
}

export default shared.inited
  ? shared.module.utilIsModuleNamespaceObject
  : shared.module.utilIsModuleNamespaceObject = init()
