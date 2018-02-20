function keysAll(object) {
  if (object == null) {
    return []
  }

  const names = Object.getOwnPropertyNames(object)
  names.push(...Object.getOwnPropertySymbols(object))
  return names
}

export default keysAll
