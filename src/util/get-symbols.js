const { getOwnPropertySymbols } = Object

function getSymbols(object) {
  return object == null
    ? []
    : getOwnPropertySymbols(object)
}

export default getSymbols
