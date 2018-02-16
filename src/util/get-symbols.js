import GenericObject from "../generic/object.js"

function getSymbols(object) {
  return object == null
    ? []
    : GenericObject.getOwnPropertySymbols(object)
}

export default getSymbols
