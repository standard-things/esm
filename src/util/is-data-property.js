import isDataPropertyDescriptor from "./is-data-property-descriptor.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function init() {
  function isDataProperty(object, name) {
    return isObjectLike(object) &&
      isDataPropertyDescriptor(Reflect.getOwnPropertyDescriptor(object, name))
  }

  return isDataProperty
}

export default shared.inited
  ? shared.module.utilIsDataProperty
  : shared.module.utilIsDataProperty = init()
