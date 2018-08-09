import has from "./has.js"
import shared from "../shared.js"

function init() {
  function assign(object) {
    const { length } = arguments

    let i = 0

    while (++i < length) {
      const source = arguments[i]

      for (const name in source) {
        if (has(source, name)) {
          object[name] = source[name]
        }
      }
    }

    return object
  }

  return assign
}

export default shared.inited
  ? shared.module.utilAssign
  : shared.module.utilAssign = init()
