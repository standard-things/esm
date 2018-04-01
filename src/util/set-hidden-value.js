import binding from "../binding.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function setHiddenValue(object, name, value) {
  if (shared.support.setHiddenValue &&
      typeof name === shared.utilBinding.hiddenKeyType &&
      isObjectLike(object)) {
    try {
      return binding.util.setHiddenValue(object, name, value)
    } catch (e) {}
  }

  return false
}

export default setHiddenValue
