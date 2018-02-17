import GenericObject from "../generic/object.js"

const ExError = __external__.Error

function isError(value) {
  if (value instanceof Error ||
      value instanceof ExError) {
    return true
  }

  return GenericObject.toString(value) === "[object Error]"
}

export default isError
