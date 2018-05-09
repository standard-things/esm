import copyProperty from "./copy-property.js"
import keysAll from "./keys-all.js"

function copy(object) {
  const argCount = arguments.length

  let i = 0

  while (++i < argCount) {
    const source = arguments[i]
    const names = keysAll(source)

    for (const name of names) {
      copyProperty(object, source, name)
    }
  }

  return object
}

export default copy
