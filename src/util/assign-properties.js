import assignProperty from "./assign-property.js"
import isObjectLike from "./is-object-like.js"

const hasOwn = Object.prototype.hasOwnProperty

function assignProperties(object, source, removeBefore) {
  if (! isObjectLike(object) || ! isObjectLike(source)) {
    return object
  }

  for (const key in source) {
    if (hasOwn.call(source, key)) {
      assignProperty(object, source, key, removeBefore)
    }
  }

  return object
}

export default assignProperties
