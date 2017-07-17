import has from "./has.js"

const lookupSetter = Object.prototype.__lookupSetter__

function getSetter(object, key) {
  return has(object, key) ? lookupSetter.call(object, key) : void 0
}

export default getSetter
