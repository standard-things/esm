import has from "./has.js"
import isObjectLike from "./is-object-like.js"

const typeSym = Symbol.for("@std/esm:sourceType")

function getSourceType(exported) {
  if (isObjectLike(exported)) {
    if (has(exported, "__esModule") &&
        exported.__esModule === true) {
      if (has(exported, typeSym) &&
          exported[typeSym] === "module") {
        return "module"
      }

      return "module-like"
    }

    if (has(exported, typeSym) &&
        typeof exported[typeSym] === "string") {
      return exported[typeSym]
    }
  }

  return "script"
}

export default getSourceType
