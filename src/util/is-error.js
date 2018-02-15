import SafeObject from "../builtin/object.js"

function isError(value) {
  return value instanceof Error ||
    SafeObject.prototype.toString.call(value) === "[object Error]"
}

export default isError
