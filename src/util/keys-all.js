const { getOwnPropertyNames, getOwnPropertySymbols } = Object

function keysAll(object) {
  if (object == null) {
    return []
  }

  const names = getOwnPropertyNames(object)
  names.push(...getOwnPropertySymbols(object))
  return names
}

export default keysAll
