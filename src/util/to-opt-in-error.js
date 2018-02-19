import { name } from "../version.js"
import safeToString from "../util/safe-to-string.js"

function toOptInError(error) {
  if (error.code === "ERR_REQUIRE_ESM") {
    error.message = safeToString(error.message)
      .replace("Must use import", "Must opt-in " + name)
  }

  return error
}

export default toOptInError
