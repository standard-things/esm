import isObjectLike from "./is-object-like.js"

const esmSym = Symbol.for("__esModule")

function setModule(exported) {
  if (isObjectLike(exported)) {
    exported[esmSym] = true
  }

  return exported
}

export default setModule
