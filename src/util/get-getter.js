import has from "./has.js"

const { __lookupGetter__ } = Object.prototype

function getGetter(object, key) {
  return has(object, key) ? __lookupGetter__.call(object, key) : void 0
}

export default getGetter
