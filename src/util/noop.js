import shared from "../shared.js"

function init() {
  function noop() {
    // No operation performed.
  }

  return noop
}

export default shared.inited
  ? shared.module.utilNoop
  : shared.module.utilNoop = init()
