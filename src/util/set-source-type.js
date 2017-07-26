import isObjectLike from "./is-object-like.js"
import setProperty from "./set-property.js"

const typeSym = Symbol.for("@std/esm:sourceType")

function setSourceType(exported, type) {
  if (isObjectLike(exported)) {
    setProperty(exported, typeSym, {
      configurable: false,
      enumerable: false,
      value: type,
      writable: false
    })
  }

  return exported
}

export default setSourceType
