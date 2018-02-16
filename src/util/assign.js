import GenericObject from "../generic/object.js"

function assign(object) {
  let i = 0
  const argCount = arguments.length
  const { hasOwnProperty } = GenericObject

  while (++i < argCount) {
    const source = arguments[i]

    for (const name in source) {
      if (hasOwnProperty(source, name)) {
        object[name] = source[name]
      }
    }
  }

  return object
}

export default assign
