import binding from "../binding.js"
import hiddenKeyType from "../hidden-key-type.js"
import isObjectLike from "./is-object-like.js"

const _getHiddenValue = binding.util.getHiddenValue

const useGetHiddenValue =
  hiddenKeyType !== "undefined" &&
  typeof _getHiddenValue === "function"

function getHiddenValue(object, key) {
  if (useGetHiddenValue &&
      typeof key === hiddenKeyType &&
      isObjectLike(object)) {
    try {
      return _getHiddenValue(object, key)
    } catch (e) {}
  }
}

export default getHiddenValue
