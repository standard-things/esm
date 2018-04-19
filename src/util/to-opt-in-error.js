import safeToString from "../util/safe-to-string.js"
import { version } from "../version.js"

function toOptInError(error) {
  if (error.code === "ERR_REQUIRE_ESM") {
    error.message = safeToString(error.message)
      .replace("Must use import", "Must opt-in esm@" + version)
  }

  return error
}

export default toOptInError
