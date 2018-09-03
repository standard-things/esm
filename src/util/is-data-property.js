import isDataPropertyDescriptor from "./is-data-property-descriptor.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  function isDataProperty(object, name) {
    if (! isObjectLike(object)) {
      return false
    }

    const descriptor = name === void 0
      ? object
      : Reflect.getOwnPropertyDescriptor(object, name)

    return isDataPropertyDescriptor(descriptor)
  }

  return isDataProperty
}

export default shared.inited
  ? shared.module.utilIsDataProperty
  : shared.module.utilIsDataProperty = init()
