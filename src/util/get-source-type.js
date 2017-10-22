import has from "./has.js"

const typeSym = Symbol.for("@std/esm:sourceType")

function getSourceType(exported) {
  return has(exported, typeSym) ? exported[typeSym] : "script"
}

export default getSourceType
