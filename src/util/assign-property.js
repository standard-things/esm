import getGetter from "./get-getter.js"
import getSetter from "./get-setter.js"
import removeProperty from "./remove-property.js"
import setGetter from "./set-getter.js"
import setSetter from "./set-setter.js"

function assignProperty(object, source, key, removeBefore) {
  const getter = getGetter(source, key)
  const setter = getSetter(source, key)
  const hasGetter = typeof getter === "function"
  const hasSetter = typeof setter === "function"
  const value = (hasGetter || hasSetter) ? void 0 : source[key]

  if (removeBefore) {
    removeProperty(object, key)
  }

  if (hasGetter || hasSetter) {
    if (hasGetter) {
      setGetter(object, key, getter)
    }
    if (hasSetter) {
      setSetter(object, key, setter)
    }
  } else {
    object[key] = value
  }

  return object
}

export default assignProperty
