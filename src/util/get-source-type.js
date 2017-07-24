import isObjectLike from "./is-object-like.js"

const esStrKey = "__esModule"
const esSymKey = Symbol.for(esStrKey)
const hasOwn = Object.prototype.hasOwnProperty

function getSourceType(exported) {
  if (isObjectLike(exported)) {
    if (hasOwn.call(exported, esSymKey) && exported[esSymKey] === true) {
      return "module"
    }

    if (hasOwn.call(exported, esStrKey) && exported[esStrKey] === true) {
      return "module-like"
    }
  }

  return "script"
}

export default getSourceType
