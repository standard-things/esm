import shared from "../shared.js"

function init() {
  function isUpdatableGet(object, name) {
    const descriptor = Reflect.getOwnPropertyDescriptor(object, name)

    if (descriptor !== void 0) {
      // Section 9.5.8: [[Get]]()
      // Step 10: If either the data descriptor is not configurable or writable,
      // or the accessor descriptor has no getter, then the value must be the same.
      // https://tc39.github.io/ecma262/#sec-proxy-object-internal-methods-and-internal-slots-get-p-receiver
      return descriptor.configurable === true ||
             descriptor.writable === true ||
             typeof descriptor.get === "function"
    }

    return true
  }

  return isUpdatableGet
}

export default shared.inited
  ? shared.module.utilIsUpdatableGet
  : shared.module.utilIsUpdatableGet = init()
