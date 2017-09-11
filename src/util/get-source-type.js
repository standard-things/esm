import has from "./has.js"
import isObjectLike from "./is-object-like.js"

const typeSym = Symbol.for("@std/esm:sourceType")

function getSourceType(exported) {
  let type = "script"

  if (isObjectLike(exported)) {
    if (has(exported, typeSym) &&
        typeof exported[typeSym] === "string") {
      type = exported[typeSym]
    }

    if (type === "script" &&
        has(exported, "__esModule") &&
        exported.__esModule === true) {
      type = "module-like"
    }
  }

  return type
}

export default getSourceType
