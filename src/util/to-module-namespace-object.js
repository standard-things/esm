import keys from "./keys.js"
import shared from "../shared.js"

function init() {
  const toStringTagDescriptor = {
    value: "Module"
  }

  function toModuleNamespaceObject(object, getter = Reflect.get) {
    // Section 9.4.6: Module Namespace Exotic Objects
    // Module namespace objects have a `null` [[Prototype]].
    // https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects
    const namespace = { __proto__: null }

    // Section 26.3.1: @@toStringTag
    // Module namespace objects have a @@toStringTag value of "Module".
    // https://tc39.github.io/ecma262/#sec-@@tostringtag
    Reflect.defineProperty(namespace, Symbol.toStringTag, toStringTagDescriptor)

    // Table 29: Internal Slots of Module Namespace Exotic Objects
    // Properties should be assigned in `Array#sort()` order.
    // https://tc39.github.io/ecma262/#table-29
    const names = keys(object).sort()

    for (const name of names) {
      namespace[name] = getter(object, name)
    }

    return namespace
  }

  return toModuleNamespaceObject
}

export default shared.inited
  ? shared.module.utilToModuleNamespaceObject
  : shared.module.utilToModuleNamespaceObject = init()
