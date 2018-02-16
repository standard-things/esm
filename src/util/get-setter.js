import GenericObject from "../generic/object.js"

import has from "./has.js"

function getSetter(object, key) {
  if (has(object, key)) {
    return GenericObject.__lookupSetter__(object, key) || null
  }

  return null
}

export default getSetter
