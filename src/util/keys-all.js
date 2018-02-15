import SafeObject from "../builtin/object.js"

function keysAll(object) {
  if (object == null) {
    return []
  }

  const names = SafeObject.getOwnPropertyNames(object)
  names.push(...SafeObject.getOwnPropertySymbols(object))
  return names
}

export default keysAll
