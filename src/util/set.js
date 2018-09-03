import shared from "../shared.js"

function init() {
  function set(object, name, value) {
    try {
      object[name] = value
    } catch {}

    return object
  }

  return set
}

export default shared.inited
  ? shared.module.utilSet
  : shared.module.utilSet = init()
