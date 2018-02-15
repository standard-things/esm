import SafeObject from "../builtin/object.js"

function assign(object) {
  let i = 0
  const argCount = arguments.length
  const { hasOwnProperty } = SafeObject.prototype

  while (++i < argCount) {
    const source = arguments[i]

    for (const name in source) {
      if (hasOwnProperty.call(source, name)) {
        object[name] = source[name]
      }
    }
  }

  return object
}

export default assign
