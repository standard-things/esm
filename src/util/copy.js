import copyProperty from "./copy-property.js"

const { getOwnPropertyNames, getOwnPropertySymbols } = Object

function copy(object) {
  let i = 0
  const argCount = arguments.length

  while (++i < argCount) {
    const source = arguments[i]

    if (source == null) {
      continue
    }

    const names = getOwnPropertyNames(source)
    names.push(...getOwnPropertySymbols(source))

    for (const name of names) {
      copyProperty(object, source, name)
    }
  }

  return object
}

export default copy
