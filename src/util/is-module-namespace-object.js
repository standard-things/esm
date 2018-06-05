import isObjectLike from "./is-object-like.js"
import isOwnProxy from "./is-own-proxy.js"
import shared from "../shared.js"

function isModuleNamespaceObject(value) {
  return isObjectLike(value) &&
    Reflect.has(value, shared.symbol.namespace) &&
    isOwnProxy(value)
}

export default isModuleNamespaceObject
