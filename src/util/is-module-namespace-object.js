import isObject from "./is-object.js"
import isOwnProxy from "./is-own-proxy.js"
import shared from "../shared.js"

function init() {
  function isModuleNamespaceObject(value) {
    return isObject(value) &&
           Reflect.has(value, shared.symbol.namespace) &&
           isOwnProxy(value)
  }

  return isModuleNamespaceObject
}

export default shared.inited
  ? shared.module.utilIsModuleNamespaceObject
  : shared.module.utilIsModuleNamespaceObject = init()
