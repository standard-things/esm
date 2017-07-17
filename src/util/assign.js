import isObjectLike from "./is-object-like.js"

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

    let j = -1
    const keys = Object.keys(source)
    const keyCount = keys.length

    while (++j < keyCount) {
      const key = keys[j]
      object[key] = source[key]
    }
  }

  return object
}
