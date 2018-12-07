import errors from "../errors.js"
import shared from "../shared.js"

function init() {
  const {
    ERR_INVALID_ARG_TYPE
  } = errors

  function validateString(value, name) {
    if (typeof value !== "string") {
      throw new ERR_INVALID_ARG_TYPE(name, "string", value)
    }
  }

  return validateString
}

export default shared.inited
  ? shared.module.utilValidateString
  : shared.module.utilValidateString = init()
