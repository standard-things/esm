import has from "./has.js"

const { __lookupGetter__ } = Object.prototype

function getGetter(object, key) {
  if (has(object, key)) {
    return __lookupGetter__.call(object, key) || null
  }

  return null
}

export default getGetter
