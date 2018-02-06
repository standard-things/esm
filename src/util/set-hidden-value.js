import binding from "../binding.js"
import hiddenKeyType from "../hidden-key-type.js"
import isObjectLike from "./is-object-like.js"

const _setHiddenValue = binding.util.setHiddenValue

const useSetHiddenValue =
  hiddenKeyType !== "undefined" &&
  typeof _setHiddenValue === "function"

function setHiddenValue(object, key, value) {
  if (useSetHiddenValue &&
      typeof key === hiddenKeyType &&
      isObjectLike(object)) {
    try {
      return _setHiddenValue(object, key, value)
    } catch (e) {}
  }

  return false
}

export default setHiddenValue
