import { name } from "../version.js"
import toString from "../util/to-string.js"

function toOptInError(error) {
  if (error.code === "ERR_REQUIRE_ESM") {
    error.message = toString(error.message)
      .replace("Must use import", "Must opt-in " + name)
  }

  return error
}

export default toOptInError
