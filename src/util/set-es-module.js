import setProperty from "./set-property.js"

const esmSym = Symbol.for("@std/esm:esm")

function setESM(exported, value) {
  return setProperty(exported, esmSym, {
    configurable: false,
    enumerable: false,
    value: !! value,
    writable: false
  })
}

export default setESM
