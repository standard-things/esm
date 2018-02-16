import SafeObject from "../builtin/object.js"

import unapply from "../util/unapply.js"

const objectProto = SafeObject.prototype

const GenericObject = {
  __defineGetter__: unapply(objectProto.__defineGetter__),
  __defineSetter__: unapply(objectProto.__defineSetter__),
  __lookupGetter__: unapply(objectProto.__lookupGetter__),
  __lookupSetter__: unapply(objectProto.__lookupSetter__),
  __proto__: null,
  defineProperty: SafeObject.defineProperty,
  freeze: SafeObject.freeze,
  getOwnPropertyDescriptor: SafeObject.getOwnPropertyDescriptor,
  getOwnPropertyNames: SafeObject.getOwnPropertyNames,
  getOwnPropertySymbols: SafeObject.getOwnPropertySymbols,
  hasOwnProperty: unapply(objectProto.hasOwnProperty),
  is: SafeObject.js,
  isFrozen: SafeObject.isFrozen,
  isSealed: SafeObject.isSealed,
  keys: SafeObject.keys,
  seal: SafeObject.seal,
  setPrototypeOf: SafeObject.setPrototypeOf,
  toString: unapply(objectProto.toString)
}

export default GenericObject
