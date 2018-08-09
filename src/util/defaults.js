import has from "./has.js"
import shared from "../shared.js"

function init() {
  function defaults(object) {
    const { length } = arguments

    let i = 0

    while (++i < length) {
      const source = arguments[i]

      for (const name in source) {
        if (has(source, name) &&
            (object[name] === void 0 ||
            ! has(object, name))) {
          object[name] = source[name]
        }
      }
    }

    return object
  }

  return defaults
}

export default shared.inited
  ? shared.module.utilDefaults
  : shared.module.utilDefaults = init()
