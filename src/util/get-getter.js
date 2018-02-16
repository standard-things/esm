import GenericObject from "../generic/object.js"

import has from "./has.js"

function getGetter(object, key) {
  if (has(object, key)) {
    return GenericObject.__lookupGetter__(object, key) || null
  }

  return null
}

export default getGetter
