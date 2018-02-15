import SafeObject from "../builtin/object.js"

import has from "./has.js"

function getSetter(object, key) {
  if (has(object, key)) {
    return SafeObject.prototype.__lookupSetter__.call(object, key) || null
  }

  return null
}

export default getSetter
