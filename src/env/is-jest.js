import shared from "../shared.js"

function init() {
  function isJest() {
    return !! __jest__
  }

  return isJest
}

export default shared.inited
  ? shared.module.envIsJest
  : shared.module.envIsJest = init()
