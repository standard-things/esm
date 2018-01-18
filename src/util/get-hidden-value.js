import binding from "../binding.js"
import isObjectLike from "./is-object-like.js"
import noDeprecationWarning from "../warning/no-deprecation-warning.js"

const utilBinding = binding.util
const _getHiddenValue = noDeprecationWarning(() => utilBinding.getHiddenValue)

const useGetHiddenValue = typeof _getHiddenValue === "function"

function getHiddenValue(object, key) {
  if (useGetHiddenValue &&
      isObjectLike(object)) {
    try {
      return _getHiddenValue.call(utilBinding, object, key)
    } catch (e) {}
  }
}

export default getHiddenValue
