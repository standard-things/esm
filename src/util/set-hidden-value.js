import binding from "../binding.js"
import isObjectLike from "./is-object-like.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"

const utilBinding = binding.util
const _setHiddenValue = noDeprecationWarning(() => utilBinding.setHiddenValue)

const useSetHiddenValue = typeof _setHiddenValue === "function"

function setHiddenValue(object, key, value) {
  if (useSetHiddenValue &&
      isObjectLike(object)) {
    try {
      return _setHiddenValue.call(utilBinding, object, key, value)
    } catch (e) {}
  }

  return false
}

export default setHiddenValue
