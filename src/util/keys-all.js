import shared from "../shared.js"

function init() {
  function keysAll(object) {
    return object == null
      ? []
      : Reflect.ownKeys(object)
  }

  return keysAll
}

export default shared.inited
  ? shared.module.utilKeysAll
  : shared.module.utilKeysAll = init()
