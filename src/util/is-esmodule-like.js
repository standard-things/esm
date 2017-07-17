import isObjectLike from "./is-object-like.js"

const esStrKey = "__esModule"
const esSymKey = Symbol.for(esStrKey)
const hasOwn = Object.prototype.hasOwnProperty

export default function isESModuleLike(exported) {
  return isObjectLike(exported) &&
    ((hasOwn.call(exported, esSymKey) && !! exported[esSymKey]) ||
      (hasOwn.call(exported, esStrKey) && !! exported[esStrKey]))
}
