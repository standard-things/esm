import isObjectLike from "./is-object-like.js"

const esSymKey = Symbol.for("__esModule")

function setModule(exported) {
  if (isObjectLike(exported)) {
    exported[esSymKey] = true
  }

  return exported
}

export default setModule
