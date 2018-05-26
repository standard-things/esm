import isOwnProxy from "./is-own-proxy.js"
import shared from "../shared.js"

function isModuleNamespaceObject(value) {
  return Reflect.has(value, shared.symbol.namespace) &&
    isOwnProxy(value)
}

export default isModuleNamespaceObject
