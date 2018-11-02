import shared from "../shared.js"

function init() {
  function isOwnError(error) {
    return error instanceof Error
  }

  return isOwnError
}

export default shared.inited
  ? shared.module.utilIsOwnError
  : shared.module.utilIsOwnError = init()
