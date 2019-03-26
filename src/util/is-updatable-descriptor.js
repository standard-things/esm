import has from "./has.js"
import isObject from "./is-object.js"
import shared from "../shared.js"

function init() {
  function isUpdatableDescriptor(descriptor) {
    // Section 9.1.6.3: ValidateAndApplyPropertyDescriptor()
    // Step 7: If the data descriptor is not configurable or writable,
    // then the value must be the same.
    // https://tc39.github.io/ecma262/#sec-validateandapplypropertydescriptor
    return isObject(descriptor) &&
      (descriptor.configurable === true ||
       descriptor.writable === true) &&
      has(descriptor, "value")
  }

  return isUpdatableDescriptor
}

export default shared.inited
  ? shared.module.utilIsUpdatableDescriptor
  : shared.module.utilIsUpdatableDescriptor = init()
