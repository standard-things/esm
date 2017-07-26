import has from "./has.js"

const typeSym = Symbol.for("@std/esm:sourceType")

function getSourceType(exported) {
  if (has(exported, typeSym) &&
      typeof exported[typeSym] === "string") {
    return exported[typeSym]
  }

  if (has(exported, "__esModule") &&
      exported.__esModule === true) {
    return "module-like"
  }

  return "script"
}

export default getSourceType
