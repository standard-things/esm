import has from "./has.js"

const esmSym = Symbol.for("@std/esm:esm")

function isESM(exported) {
  return has(exported, esmSym) && exported[esmSym]
}

export default isESM
