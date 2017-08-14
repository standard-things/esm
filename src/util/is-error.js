const { toString } = Object.prototype

function isError(value) {
  return value instanceof Error || toString.call(value) === "[object Error]"
}

export default isError
