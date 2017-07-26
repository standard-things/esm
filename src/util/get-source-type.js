import has from "./has.js"

const esmKey = "__esModule"
const esmSym = Symbol.for(esmKey)

function getSourceType(exported) {
  if (has(exported, esmSym) && exported[esmSym] === true) {
    return "module"
  }

  if (has(exported, esmKey) && exported[esmKey] === true) {
    return "module-like"
  }

  return "script"
}

export default getSourceType
