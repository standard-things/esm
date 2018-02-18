import has from "./has.js"

const { __lookupSetter__ } = Object.prototype

function getSetter(object, key) {
  if (has(object, key)) {
    return __lookupSetter__.call(object, key) || null
  }

  return null
}

export default getSetter
