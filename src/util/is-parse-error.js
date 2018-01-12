import errors from "../parse/errors.js"

function isParseError(value) {
  for (const name in errors) {
    if (value instanceof errors[name]) {
      return true
    }
  }

  return false
}

export default isParseError
