import has from "./has.js"

const typeSym = Symbol.for("@std/esm:sourceType")

function getSourceType(exported) {
  if (has(exported, "__esModule") &&
      exported.__esModule === true) {
    return "module-like"
  }

  if (has(exported, typeSym) &&
      typeof exported[typeSym] === "string") {
    return exported[typeSym]
  }

  return "script"
}

export default getSourceType
