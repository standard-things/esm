import shared from "../shared.js"

function init() {
  function identity(value) {
    return value
  }

  return identity
}

export default shared.inited
  ? shared.module.utilIdentity
  : shared.module.utilIdentity = init()
