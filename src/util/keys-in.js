import shared from "../shared.js"

function init() {
  function keysIn(object) {
    const result = []

    for (const name in object) {
      result.push(name)
    }

    return result
  }

  return keysIn
}

export default shared.inited
  ? shared.module.utilKeysIn
  : shared.module.utilKeysIn = init()
