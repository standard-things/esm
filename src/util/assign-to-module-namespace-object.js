import has from "./has.js"
import keys from "./keys.js"
import shared from "../shared.js"

function init() {
  function assignToModuleNamespaceObject(namespace, source, getter = Reflect.get) {
    const names = keys(namespace)
    const object = names.length === 0 ? void 0 : {}

    for (const name of names) {
      object[name] = namespace[name]
      Reflect.deleteProperty(namespace, name)
    }

    names.push(...keys(source))

    // Table 29: Internal Slots of Module Namespace Exotic Objects
    // Properties should be assigned in `Array#sort()` order.
    // https://tc39.github.io/ecma262/#table-29
    names.sort()

    for (const name of names) {
      namespace[name] = has(source, name)
        ? getter(source, name)
        : object[name]
    }

    return namespace
  }

  return assignToModuleNamespaceObject
}

export default shared.inited
  ? shared.module.utilAssignToModuleNamespaceObject
  : shared.module.utilAssignToModuleNamespaceObject = init()
