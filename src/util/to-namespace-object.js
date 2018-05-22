import keys from "./keys.js"

const toStringTagDescriptor = {
  value: "Module"
}

function toNamespaceObject(object, getter = Reflect.get) {
  // Section 9.4.6: Module Namespace Exotic Objects
  // Module namespace objects have a `null` [[Prototype]].
  // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
  const namespace = { __proto__: null }

  // Section 26.3.1: @@toStringTag
  // Module namespace objects have a @@toStringTag value of "Module".
  // https://tc39.github.io/ecma262/#sec-@@tostringtag
  Reflect.defineProperty(namespace, Symbol.toStringTag, toStringTagDescriptor)

  // Table 29: Internal Slots of Module Namespace Exotic Objects
  // Properties should be assigned in `Array#sort` order.
  // https://tc39.github.io/ecma262/#table-29
  const names = keys(object).sort()

  for (const name of names) {
    namespace[name] = getter(object, name)
  }

  return namespace
}

export default toNamespaceObject
