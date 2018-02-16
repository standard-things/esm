import GenericObject from "../generic/object.js"

function defaults(object) {
  let i = 0
  const argCount = arguments.length
  const { hasOwnProperty } = GenericObject

  while (++i < argCount) {
    const source = arguments[i]

    for (const key in source) {
      if (hasOwnProperty(source, key) &&
          (object[key] === void 0 ||
           ! hasOwnProperty(object, key))) {
        object[key] = source[key]
      }
    }
  }

  return object
}

export default defaults
