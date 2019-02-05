import isObject from "./is-object.js"
import shared from "../shared.js"

function init() {
  function isDescriptorMatch(currentDescriptor, newDescriptor) {
    if (! isObject(currentDescriptor)) {
      return ! isObject(newDescriptor)
    }

    for (const name in newDescriptor) {
      if (! Object.is(currentDescriptor[name], newDescriptor[name])) {
        return false
      }
    }

    return true
  }

  return isDescriptorMatch
}

export default shared.inited
  ? shared.module.utilIsDescriptorMatch
  : shared.module.utilIsDescriptorMatch = init()
