import GenericArray from "../generic/array.js"
import GenericObject from "../generic/object.js"

function keysAll(object) {
  if (object == null) {
    return []
  }

  const names = GenericObject.getOwnPropertyNames(object)
  GenericArray.push(names, ...GenericObject.getOwnPropertySymbols(object))
  return names
}

export default keysAll
