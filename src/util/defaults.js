const { hasOwnProperty } = Object.prototype

function defaults(object) {
  const argCount = arguments.length

  let i = 0

  while (++i < argCount) {
    const source = arguments[i]

    for (const name in source) {
      if (hasOwnProperty.call(source, name) &&
          (object[name] === void 0 ||
           ! hasOwnProperty.call(object, name))) {
        object[name] = source[name]
      }
    }
  }

  return object
}

export default defaults
