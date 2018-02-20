function getSymbols(object) {
  return object == null
    ? []
    : Object.getOwnPropertySymbols(object)
}

export default getSymbols
