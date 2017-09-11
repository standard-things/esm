import getGetter from "./get-getter.js"
import getSetter from "./get-setter.js"
import isObjectLike from "./is-object-like.js"
import setGetter from "./set-getter.js"
import setSetter from "./set-setter.js"

function assignProperty(object, source, key) {
  if (! isObjectLike(object)) {
    return object
  }

  const getter = getGetter(source, key)
  const setter = getSetter(source, key)
  const hasGetter = typeof getter === "function"
  const hasSetter = typeof setter === "function"

  if (hasGetter || hasSetter) {
    if (hasGetter) {
      setGetter(object, key, getter)
    }
    if (hasSetter) {
      setSetter(object, key, setter)
    }
  } else {
    object[key] = source[key]
  }

  return object
}

export default assignProperty
