import setProperty from "./set-property.js"

const typeSym = Symbol.for("@std/esm:sourceType")

function setSourceType(exported, type) {
  return setProperty(exported, typeSym, {
    configurable: false,
    enumerable: false,
    value: type,
    writable: false
  })
}

export default setSourceType
