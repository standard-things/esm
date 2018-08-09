import copyProperty from "./copy-property.js"
import has from "./has.js"
import keysAll from "./keys-all.js"
import shared from "../shared.js"

function init() {
  function defaultsProperties(object) {
    const { length } = arguments

    let i = 0

    while (++i < length) {
      const source = arguments[i]
      const names = keysAll(source)

      for (const name of names) {
        if (has(source, name) &&
            (object[name] === void 0 ||
            ! has(object, name))) {
          copyProperty(object, source, name)
        }
      }
    }

    return object
  }

  return defaultsProperties
}

export default shared.inited
  ? shared.module.utilDefaultsProperties
  : shared.module.utilDefaultsProperties = init()
