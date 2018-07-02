import isObject from "./is-object.js"
import shared from "../shared.js"

function init() {
  function isDataDescriptor(descriptor) {
    return isObject(descriptor) &&
      descriptor.configurable === true &&
      descriptor.enumerable === true &&
      descriptor.writable === true &&
      Reflect.has(descriptor, "value")
  }

  return isDataDescriptor
}

export default shared.inited
  ? shared.module.utilIsDataDescriptor
  : shared.module.utilIsDataDescriptor = init()
