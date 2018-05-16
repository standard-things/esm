import copyProperty from "./copy-property.js"
import keysAll from "./keys-all.js"

function copy(object) {
  const { length } = arguments

  let i = 0

  while (++i < length) {
    const source = arguments[i]
    const names = keysAll(source)

    for (const name of names) {
      copyProperty(object, source, name)
    }
  }

  return object
}

export default copy
