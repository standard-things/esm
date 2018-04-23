import shared from "../shared.js"

function init() {
  const ExError = __external__.Error

  const { toString } = Object.prototype

  function isError(value) {
    if (value instanceof Error ||
        value instanceof ExError) {
      return true
    }

    return toString(value) === "[object Error]"
  }

  return isError
}

export default shared.inited
  ? shared.module.utilIsError
  : shared.module.utilIsError = init()
