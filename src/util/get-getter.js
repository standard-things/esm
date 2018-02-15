import SafeObject from "../builtin/object.js"

import has from "./has.js"

function getGetter(object, key) {
  if (has(object, key)) {
    return SafeObject.prototype.__lookupGetter__.call(object, key) || null
  }

  return null
}

export default getGetter
