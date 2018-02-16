import GenericString from "../generic/string.js"

import { name } from "../version.js"

function toOptInError(error) {
  if (error.code === "ERR_REQUIRE_ESM") {
    error.message = GenericString.replace(error.message, "Must use import", "Must opt-in " + name)
  }

  return error
}

export default toOptInError
