import has from "./has.js"
import isObject from "./is-object.js"
import shared from "../shared.js"

function init() {
  function isDataPropertyDescriptor(descriptor) {
    return isObject(descriptor) &&
      descriptor.configurable === true &&
      descriptor.enumerable === true &&
      descriptor.writable === true &&
      has(descriptor, "value")
  }

  return isDataPropertyDescriptor
}

export default shared.inited
  ? shared.module.utilIsDataPropertyDescriptor
  : shared.module.utilIsDataPropertyDescriptor = init()
