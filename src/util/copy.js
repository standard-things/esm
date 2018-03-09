import copyProperty from "./copy-property.js"
import keysAll from "./keys-all.js"

function copy(object) {
  let i = 0
  const argCount = arguments.length

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
