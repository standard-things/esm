const { hasOwnProperty } = Object.prototype

function defaults(object) {
  let i = 0
  const argCount = arguments.length

  while (++i < argCount) {
    const source = arguments[i]

    for (const key in source) {
      if (hasOwnProperty.call(source, key) &&
          (object[key] === void 0 ||
           ! hasOwnProperty.call(object, key))) {
        object[key] = source[key]
      }
    }
  }

  return object
}

export default defaults
