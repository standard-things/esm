import GenericObject from "../generic/object.js"

function isError(value) {
  if (value instanceof Error) {
    return true
  }

  return GenericObject.toString(value) === "[object Error]"
}

export default isError
