import binding from "../binding.js"
import isObjectLike from "./is-object-like.js"
import shared from "../shared.js"

function getHiddenValue(object, key) {
  if (! isObjectLike(object)) {
    return
  }

  if (shared.support.getHiddenValue &&
      typeof key === shared.hiddenKeyType) {
    try {
      return binding.util.getHiddenValue(object, key)
    } catch (e) {}
  }
}

export default getHiddenValue
