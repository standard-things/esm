import isObjectLike from "./is-object-like.js"

const hasOwn = Object.prototype.hasOwnProperty

export default function assign(object) {
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
      if (hasOwn.call(source, key)) {
        object[key] = source[key]
      }
    }
  }

  return object
}
