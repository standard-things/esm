const ExError = __external__.Error

const { toString } = Object.prototype

function isError(value) {
  if (value instanceof Error ||
      value instanceof ExError) {
    return true
  }

  return toString(value) === "[object Error]"
}

export default isError
