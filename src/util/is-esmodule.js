import isObjectLike from "./is-object-like.js"

const esSymKey = Symbol.for("__esModule")
const hasOwn = Object.prototype.hasOwnProperty

function isESModule(exported) {
  return isObjectLike(exported) &&
    hasOwn.call(exported, esSymKey) && !! exported[esSymKey]
}

export default isESModule
