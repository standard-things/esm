import binding from "../binding.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function setHiddenValue(object, key, value) {
  if (shared.support.setHiddenValue &&
      typeof key === shared.hiddenKeyType &&
      isObjectLike(object)) {
    try {
      return binding.util.setHiddenValue(object, key, value)
    } catch (e) {}
  }

  return false
}

export default setHiddenValue
