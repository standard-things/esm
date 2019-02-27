import shared from "../shared.js"

function init() {
  function isUpdatableSet(object, name) {
    const descriptor = Reflect.getOwnPropertyDescriptor(object, name)

    if (descriptor !== void 0) {
      // Section 9.5.9: [[Set]]()
      // Step 11: If either the data descriptor is not configurable or writable,
      // or the accessor descriptor has no setter, then the value must be the same.
      // https://tc39.github.io/ecma262/#sec-proxy-object-internal-methods-and-internal-slots-set-p-v-receiver
      return descriptor.configurable === true ||
             descriptor.writable === true ||
             typeof descriptor.set === "function"
    }

    return true
  }

  return isUpdatableSet
}

export default shared.inited
  ? shared.module.utilIsUpdatableSet
  : shared.module.utilIsUpdatableSet = init()
