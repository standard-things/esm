import isObjectLike from "./is-object-like.js"
import keys from "./keys.js"

function assign(object) {
  if (! isObjectLike(object)) {
    return object
  }

  let i = 0
  const argCount = arguments.length

  while (++i < argCount) {
    const source = arguments[i]
    const names = keys(source)

    for (const name of names) {
      object[name] = source[name]
    }
  }

  return object
}

export default assign
