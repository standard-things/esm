import has from "./has.js"
import isObjectLike from "./is-object-like.js"
import setProperty from "./set-property.js"

const typeSym = Symbol.for("@std/esm:sourceType")

function setSourceType(exported, type) {
  if (! isObjectLike(exported) ||
      (has(exported, "__esModule") && exported.__esModule === true)) {
    return exported
  }

  if (type === "module") {
    exported[typeSym] = type
    return exported
  }

  return setProperty(exported, typeSym, {
    configurable: false,
    enumerable: false,
    value: type,
    writable: false
  })
}

export default setSourceType
