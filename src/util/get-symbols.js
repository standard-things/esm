import SafeObject from "../builtin/object.js"

function getSymbols(object) {
  return object == null
    ? []
    : SafeObject.getOwnPropertySymbols(object)
}

export default getSymbols
