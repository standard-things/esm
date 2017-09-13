import has from "./has.js"

const { __lookupSetter__ } = Object.prototype

function getSetter(object, key) {
  return has(object, key) ? __lookupSetter__.call(object, key) : void 0
}

export default getSetter
