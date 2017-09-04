import has from "./has.js"
import isObjectLike from "./is-object-like.js"

function defaults(object) {
  if (! isObjectLike(object)) {
    return object
  }

  let i = 0
  const argCount = arguments.length

  while (++i < argCount) {
    const source = arguments[i]

    if (! isObjectLike(source)) {
      continue
    }

    for (const key in source) {
      if (has(source, key) &&
          (object[key] === void 0 ||
           ! has(object, key))) {
        object[key] = source[key]
      }
    }
  }

  return object
}

export default defaults
