import keysAll from "./keys-all.js"
import shared from "../shared.js"

function init() {
  function assignAll(object) {
    const { length } = arguments

    let i = 0

    while (++i < length) {
      const source = arguments[i]
      const names = keysAll(source)

      for (const name of names) {
        object[name] = source[name]
      }
    }

    return object
  }

  return assignAll
}

export default shared.inited
  ? shared.module.utilAssignAll
  : shared.module.utilAssignAll = init()

